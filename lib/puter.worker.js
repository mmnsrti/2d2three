var PROJECT_PREFIX = 'roomify_project_';
var MIN_MARKET_USD_TO_IRR = 200000;
var RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
var rateCache = null;

var jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({  error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

var getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();

        return user?.uuid || null;
    } catch {
        return null;
    }
}

var parseNumericRate = (value) => {
    const numeric = Number(String(value ?? '').replace(/,/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
};

var fetchNobitexUsdToIrr = async () => {
    const response = await fetch('https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls', {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const rate = parseNumericRate(payload?.stats?.['usdt-rls']?.latest);
    if (!rate || rate < MIN_MARKET_USD_TO_IRR) return null;
    return rate;
};

var fetchExchangeRateUsdToIrr = async () => {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const rate = parseNumericRate(payload?.rates?.IRR);
    if (!rate || rate < MIN_MARKET_USD_TO_IRR) return null;
    return rate;
};

router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user.puter;

        if(!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;

        if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required');

        const payload = {
            ...project,
            updatedAt: new Date().toISOString(),
        }

        const userId = await getUserId(userPuter);
        if(!userId) return jsonError(401, 'Authentication failed');

        const key = `${PROJECT_PREFIX}${project.id}`;
        await userPuter.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .map(({value}) => ({ ...value, isPublic: true }))

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
})

router.delete('/api/projects/delete', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        await userPuter.kv.del(key);

        return { deleted: true, id };
    } catch (e) {
        return jsonError(500, 'Failed to delete project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/rates/usd-irr', async () => {
    try {
        if (rateCache && Date.now() - rateCache.fetchedAt < RATE_CACHE_TTL_MS) {
            return {
                ok: true,
                source: rateCache.source,
                usdToIrrRate: rateCache.usdToIrrRate,
                fetchedAt: rateCache.fetchedAt,
                cached: true,
            };
        }

        const sources = [
            { id: 'nobitex', fetcher: fetchNobitexUsdToIrr },
            { id: 'exchange-rate-api', fetcher: fetchExchangeRateUsdToIrr },
        ];

        for (const source of sources) {
            try {
                const rate = await source.fetcher();
                if (rate) {
                    rateCache = {
                        source: source.id,
                        usdToIrrRate: rate,
                        fetchedAt: Date.now(),
                    };

                    return {
                        ok: true,
                        source: rateCache.source,
                        usdToIrrRate: rateCache.usdToIrrRate,
                        fetchedAt: rateCache.fetchedAt,
                        cached: false,
                    };
                }
            } catch (error) {
                // Try next source.
            }
        }

        return jsonError(502, 'No exchange-rate provider available');
    } catch (e) {
        return jsonError(500, 'Failed to fetch rate', { message: e.message || 'Unknown error' });
    }
});
