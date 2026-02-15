import {useEffect, useState} from "react";
import {PUTER_WORKER_URL} from "./constants";

const DEFAULT_FALLBACK_USD_TO_IRR = 990_000;
const DEFAULT_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_MARKET_USD_TO_IRR = 200_000;
const DEFAULT_MARGIN_RATE = 0.35;
const DEFAULT_MIN_PROFIT_TOMAN = 150_000;
const DEFAULT_FIXED_FEE_TOMAN = 0;
const DEFAULT_ROUND_STEP_TOMAN = 50_000;
const RATE_CACHE_KEY = "2d2three_usd_irr_rate_cache_v1";

type RateSnapshot = {
    usdToIrrRate: number;
    isLiveRate: boolean;
    updatedAt: number | null;
};

let cachedRate: number | null = null;
let cachedAt = 0;
let inflightRequest: Promise<number | null> | null = null;
let cachedSource = "fallback";
let workerRateRouteUnavailable = false;
let hasLoggedWorkerRouteMissing = false;

const getNumberFromEnv = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const FALLBACK_USD_TO_IRR = getNumberFromEnv(import.meta.env.VITE_USD_TO_IRR_FALLBACK, DEFAULT_FALLBACK_USD_TO_IRR);
const MARGIN_RATE = getNumberFromEnv(import.meta.env.VITE_PLAN_MARGIN_RATE, DEFAULT_MARGIN_RATE);
const MIN_PROFIT_TOMAN = getNumberFromEnv(import.meta.env.VITE_PLAN_MIN_PROFIT_TOMAN, DEFAULT_MIN_PROFIT_TOMAN);
const FIXED_FEE_TOMAN = getNumberFromEnv(import.meta.env.VITE_PLAN_FIXED_FEE_TOMAN, DEFAULT_FIXED_FEE_TOMAN);
const ROUND_STEP_TOMAN = Math.max(1, getNumberFromEnv(import.meta.env.VITE_PLAN_ROUND_STEP_TOMAN, DEFAULT_ROUND_STEP_TOMAN));
const RATE_CACHE_TTL_MS = Math.max(60_000, getNumberFromEnv(import.meta.env.VITE_RATE_CACHE_TTL_MS, DEFAULT_RATE_CACHE_TTL_MS));
const ENABLE_DIRECT_RATE_FETCH = import.meta.env.VITE_ENABLE_DIRECT_RATE_FETCH !== "false";
const ENABLE_RATE_DEBUG = import.meta.env.VITE_DEBUG_RATE === "true";
const WORKER_RATE_PATH = (import.meta.env.VITE_WORKER_RATE_PATH || "/api/rates/usd-irr").startsWith("/")
    ? (import.meta.env.VITE_WORKER_RATE_PATH || "/api/rates/usd-irr")
    : `/${import.meta.env.VITE_WORKER_RATE_PATH}`;

const parseNumericRate = (value: unknown): number | null => {
    if (value == null) return null;
    const numeric = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const logDebug = (...args: unknown[]) => {
    if (!ENABLE_RATE_DEBUG) return;
    console.log("[pricing-rate]", ...args);
};

const readPersistentCache = () => {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(RATE_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
            usdToIrrRate?: number;
            fetchedAt?: number;
            source?: string;
        };

        const usdToIrrRate = parseNumericRate(parsed?.usdToIrrRate);
        const fetchedAt = Number(parsed?.fetchedAt);
        if (!usdToIrrRate || !Number.isFinite(fetchedAt) || fetchedAt <= 0) return null;

        return {
            usdToIrrRate,
            fetchedAt,
            source: parsed?.source || "persisted",
        };
    } catch {
        return null;
    }
};

const writePersistentCache = (usdToIrrRate: number, source: string, fetchedAt: number) => {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
            usdToIrrRate,
            source,
            fetchedAt,
        }));
    } catch {
        // Ignore localStorage failures.
    }
};

const fetchFromNobitex = async (): Promise<number | null> => {
    const response = await fetch("https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls", {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json() as {
        stats?: Record<string, { latest?: string | number }>;
    };

    const rate = parseNumericRate(payload?.stats?.["usdt-rls"]?.latest);
    if (!rate || rate < MIN_MARKET_USD_TO_IRR) return null;
    return rate;
};

const fetchFromExchangeRateApi = async (): Promise<number | null> => {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json() as {
        rates?: {
            IRR?: number;
        };
    };

    const rate = parseNumericRate(payload?.rates?.IRR);
    if (!rate || rate < MIN_MARKET_USD_TO_IRR) return null;
    return rate;
};

const fetchFromWorker = async (): Promise<number | null> => {
    if (!PUTER_WORKER_URL || workerRateRouteUnavailable) return null;

    const endpoint = `${PUTER_WORKER_URL}${WORKER_RATE_PATH}`;

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "GET",
            cache: "no-store",
        });
    } catch (error) {
        workerRateRouteUnavailable = true;
        if (!hasLoggedWorkerRouteMissing) {
            hasLoggedWorkerRouteMissing = true;
            logDebug("worker-rate-network-error", endpoint, error);
        }
        return null;
    }

    if (response.status === 404) {
        workerRateRouteUnavailable = true;
        if (!hasLoggedWorkerRouteMissing) {
            hasLoggedWorkerRouteMissing = true;
            logDebug("worker-rate-route-missing", endpoint, "Redeploy worker with /api/rates/usd-irr route.");
        }
        return null;
    }

    if (!response.ok) {
        logDebug("worker-rate-error", response.status, endpoint);
        return null;
    }

    const payload = await response.json() as { usdToIrrRate?: number; source?: string };
    const rate = parseNumericRate(payload?.usdToIrrRate);
    if (!rate || rate < MIN_MARKET_USD_TO_IRR) return null;
    if (payload?.source) {
        cachedSource = `worker:${payload.source}`;
    }
    return rate;
};

const fetchUsdToIrrRate = async (): Promise<number | null> => {
    const providers: Array<{ id: string; fetcher: () => Promise<number | null> }> = [
        { id: "worker", fetcher: fetchFromWorker },
    ];

    for (const provider of providers) {
        try {
            const rate = await provider.fetcher();
            logDebug("provider-result", provider.id, rate);
            if (rate) {
                cachedSource = provider.id;
                return rate;
            }
        } catch (error) {
            logDebug("provider-error", provider.id, error);
        }
    }

    const shouldTryDirectProviders = ENABLE_DIRECT_RATE_FETCH || workerRateRouteUnavailable || !PUTER_WORKER_URL;
    if (shouldTryDirectProviders) {
        const directProviders: Array<{ id: string; fetcher: () => Promise<number | null> }> = [
            { id: "nobitex", fetcher: fetchFromNobitex },
            { id: "exchange-rate-api", fetcher: fetchFromExchangeRateApi },
        ];

        for (const provider of directProviders) {
            try {
                const rate = await provider.fetcher();
                logDebug("provider-result", provider.id, rate);
                if (rate) {
                    cachedSource = provider.id;
                    return rate;
                }
            } catch (error) {
                logDebug("provider-error", provider.id, error);
            }
        }
    }

    cachedSource = "fallback";
    return null;
};

const getLiveRate = async (): Promise<number | null> => {
    const now = Date.now();
    if (cachedRate && now - cachedAt < RATE_CACHE_TTL_MS) {
        return cachedRate;
    }

    if (!cachedRate || !cachedAt) {
        const persisted = readPersistentCache();
        if (persisted) {
            cachedRate = persisted.usdToIrrRate;
            cachedAt = persisted.fetchedAt;
            cachedSource = persisted.source;
            if (now - persisted.fetchedAt < RATE_CACHE_TTL_MS) {
                return cachedRate;
            }
        }
    }

    if (inflightRequest) return inflightRequest;

    inflightRequest = fetchUsdToIrrRate()
        .then((rate) => {
            if (rate) {
                cachedRate = rate;
                cachedAt = Date.now();
                writePersistentCache(rate, cachedSource, cachedAt);
            }
            return rate;
        })
        .finally(() => {
            inflightRequest = null;
        });

    return inflightRequest;
};

export const usdToToman = (usd: number, usdToIrrRate: number) =>
    Math.round((usd * usdToIrrRate) / 10);

const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;

export const priceWithMarginToman = (usd: number, usdToIrrRate: number) => {
    const basePrice = usdToToman(usd, usdToIrrRate);
    if (basePrice <= 0) return 0;

    const variableProfit = Math.round(basePrice * MARGIN_RATE);
    const profit = Math.max(variableProfit, MIN_PROFIT_TOMAN) + FIXED_FEE_TOMAN;
    return roundUpTo(basePrice + profit, ROUND_STEP_TOMAN);
};

export const useUsdToIrrRate = (): RateSnapshot => {
    const [state, setState] = useState<RateSnapshot>({
        usdToIrrRate: FALLBACK_USD_TO_IRR,
        isLiveRate: false,
        updatedAt: null,
    });

    useEffect(() => {
        let active = true;

        const refreshRate = async () => {
            const liveRate = await getLiveRate();
            if (!active) return;

            if (liveRate) {
                logDebug("rate-live", {
                    source: cachedSource,
                    usdToIrrRate: liveRate,
                    marginRate: MARGIN_RATE,
                    minProfitToman: MIN_PROFIT_TOMAN,
                    fixedFeeToman: FIXED_FEE_TOMAN,
                    roundStepToman: ROUND_STEP_TOMAN,
                });
                setState({
                    usdToIrrRate: liveRate,
                    isLiveRate: true,
                    updatedAt: cachedAt || Date.now(),
                });
                return;
            }

            logDebug("rate-fallback", {
                source: cachedSource,
                usdToIrrRate: FALLBACK_USD_TO_IRR,
                marginRate: MARGIN_RATE,
                minProfitToman: MIN_PROFIT_TOMAN,
                fixedFeeToman: FIXED_FEE_TOMAN,
                roundStepToman: ROUND_STEP_TOMAN,
            });
            setState((prev) => ({
                ...prev,
                isLiveRate: false,
            }));
        };

        const persisted = readPersistentCache();
        if (persisted) {
            cachedRate = persisted.usdToIrrRate;
            cachedAt = persisted.fetchedAt;
            cachedSource = persisted.source;

            setState({
                usdToIrrRate: persisted.usdToIrrRate,
                isLiveRate: Date.now() - persisted.fetchedAt < RATE_CACHE_TTL_MS,
                updatedAt: persisted.fetchedAt,
            });
        }

        void refreshRate();
        const timer = window.setInterval(() => {
            void refreshRate();
        }, RATE_CACHE_TTL_MS);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);

    return state;
};
