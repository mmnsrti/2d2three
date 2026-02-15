import type { Route } from "./+types/pricing";
import Navbar from "../../components/Navbar";
import Button from "../../components/ui/Button";
import {useNavigate, useOutletContext} from "react-router";
import {t, toLocaleDateCode} from "../../lib/i18n";
import {SITE_NAME, SITE_URL} from "../../lib/constants";
import {priceWithMarginToman, useUsdToIrrRate} from "../../lib/exchange-rate";

type PricingPlan = {
    id: string;
    name: string;
    priceUsd: number;
    description: string;
    features: string[];
    bestFor: string;
    renders: string;
    storage: string;
    queue: string;
    support: string;
    highlight?: boolean;
};

export function meta({}: Route.MetaArgs) {
    const title = `${SITE_NAME} | جزئیات قیمت گذاری`;
    const description = "جزئیات کامل پلن های قیمت گذاری 2d2three با مقایسه امکانات، سهمیه رندر و خدمات پشتیبانی.";

    return [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE_URL}/pricing` },
    ];
}

export const links: Route.LinksFunction = () => [
    { rel: "canonical", href: `${SITE_URL}/pricing` },
];

export default function Pricing() {
    const navigate = useNavigate();
    const { locale } = useOutletContext<AuthContext>();
    const copy = t[locale];
    const formatToman = (amount: number) => new Intl.NumberFormat(toLocaleDateCode(locale)).format(amount);
    const { usdToIrrRate, isLiveRate } = useUsdToIrrRate();
    const planPriceToman = (usd: number) => priceWithMarginToman(usd, usdToIrrRate);

    const plans: PricingPlan[] = [
        {
            id: "starter",
            name: copy.starterPlan,
            priceUsd: 0,
            description: copy.planStarterDesc,
            features: [copy.featurePuterAuth, copy.featurePrivateProjects, copy.featurePuterKvStorage, copy.featureLocalFailover],
            bestFor: copy.planStarterBestFor,
            renders: copy.planStarterRenders,
            storage: copy.planStarterStorage,
            queue: copy.planStarterQueue,
            support: copy.planStarterSupport,
        },
        {
            id: "pro",
            name: copy.proPlan,
            priceUsd: 10,
            description: copy.planProDesc,
            features: [copy.featurePuterWorker, copy.featureFasterRenders, copy.featurePriorityQueue, copy.featurePuterHosting],
            bestFor: copy.planProBestFor,
            renders: copy.planProRenders,
            storage: copy.planProStorage,
            queue: copy.planProQueue,
            support: copy.planProSupport,
            highlight: true,
        },
        {
            id: "agency",
            name: copy.agencyPlan,
            priceUsd: 25,
            description: copy.planAgencyDesc,
            features: [copy.featureDedicatedWorker, copy.featurePuterWorker, copy.featurePriorityQueue, copy.featurePrioritySupport],
            bestFor: copy.planAgencyBestFor,
            renders: copy.planAgencyRenders,
            storage: copy.planAgencyStorage,
            queue: copy.planAgencyQueue,
            support: copy.planAgencySupport,
        },
    ];

    const compareRows = [
        { label: copy.pricingRowPrice, values: plans.map((plan) => `${formatToman(planPriceToman(plan.priceUsd))} ${copy.pricingCurrency}`) },
        { label: copy.pricingRowRenders, values: plans.map((plan) => plan.renders) },
        { label: copy.pricingRowStorage, values: plans.map((plan) => plan.storage) },
        { label: copy.pricingRowQueue, values: plans.map((plan) => plan.queue) },
        { label: copy.pricingRowSupport, values: plans.map((plan) => plan.support) },
        { label: copy.pricingRowBestFor, values: plans.map((plan) => plan.bestFor) },
    ];
    const pricingPreviewPoints = [
        copy.pricingPreviewPointOne,
        copy.pricingPreviewPointTwo,
        copy.pricingPreviewPointThree,
    ];
    const pricingGuideSteps = [
        {
            title: copy.pricingGuideStepOneTitle,
            text: copy.pricingGuideStepOneText,
        },
        {
            title: copy.pricingGuideStepTwoTitle,
            text: copy.pricingGuideStepTwoText,
        },
        {
            title: copy.pricingGuideStepThreeTitle,
            text: copy.pricingGuideStepThreeText,
        },
    ];

    return (
        <div className="home pricing-detail-page">
            <Navbar />

            <section className="pricing">
                <div className="section-inner">
                    <div className="section-head">
                        <h2>{copy.pricingDetailsTitle}</h2>
                        <p>{copy.pricingDetailsSubtitle}</p>
                    </div>

                    <div className="pricing-highlights">
                        <p>{copy.pricingPreviewLead}</p>
                        <ul>
                            {pricingPreviewPoints.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>

                    <p className={`rate-note ${isLiveRate ? "is-live" : "is-fallback"}`}>
                        <span>{isLiveRate ? copy.pricingRateLive : copy.pricingRateFallback}</span>
                        <span>{copy.pricingValueNote}</span>
                    </p>

                    <div className="guide-grid">
                        <article className="guide-intro">
                            <h3>{copy.pricingGuideTitle}</h3>
                            <p>{copy.pricingGuideSubtitle}</p>
                        </article>
                        {pricingGuideSteps.map((step, index) => (
                            <article key={step.title} className="guide-step">
                                <span>{index + 1}</span>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </article>
                        ))}
                    </div>

                    <div className="plan-grid">
                        {plans.map((plan) => (
                            <article key={plan.id} className={`plan-card ${plan.highlight ? "is-highlighted" : ""}`}>
                                {plan.highlight && <span className="plan-badge">{copy.popular}</span>}
                                <h3>{plan.name}</h3>
                                <p className="desc">{plan.description}</p>
                                <p className="price">
                                    <strong>{formatToman(planPriceToman(plan.priceUsd))}</strong>
                                    <span>{copy.pricingCurrency} / {copy.pricingMonthly}</span>
                                </p>

                                <div className="plan-details">
                                    <div className="detail">
                                        <span>{copy.planBestForLabel}</span>
                                        <strong>{plan.bestFor}</strong>
                                    </div>
                                    <div className="detail">
                                        <span>{copy.planRendersLabel}</span>
                                        <strong>{plan.renders}</strong>
                                    </div>
                                    <div className="detail">
                                        <span>{copy.planSupportLabel}</span>
                                        <strong>{plan.support}</strong>
                                    </div>
                                </div>

                                <p className="plan-note">
                                    {plan.id === "starter"
                                        ? copy.planStarterNote
                                        : plan.id === "pro"
                                            ? copy.planProNote
                                            : copy.planAgencyNote}
                                </p>
                                <p className="feature-label">{copy.planFeaturesLabel}</p>
                                <ul className="features">
                                    {plan.features.map((feature) => (
                                        <li key={`${plan.id}-${feature}`}>{feature}</li>
                                    ))}
                                </ul>

                                <Button size="sm" className="plan-cta">
                                    {copy.planCta}
                                </Button>
                            </article>
                        ))}
                    </div>

                    <div className="mt-12">
                        <div className="section-head !text-start !max-w-none !mb-4">
                            <h2>{copy.pricingCompareTitle}</h2>
                            <p>{copy.pricingCompareSubtitle}</p>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
                            <table className="min-w-full text-sm text-slate-700">
                                <thead className="bg-stone-100">
                                    <tr>
                                        <th className="px-4 py-3 text-start font-semibold text-stone-900">{copy.pricingFeatureCol}</th>
                                        <th className="px-4 py-3 text-start font-semibold text-stone-900">{copy.pricingStarterCol}</th>
                                        <th className="px-4 py-3 text-start font-semibold text-stone-900">{copy.pricingProCol}</th>
                                        <th className="px-4 py-3 text-start font-semibold text-stone-900">{copy.pricingAgencyCol}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compareRows.map((row) => (
                                        <tr key={row.label} className="border-t border-stone-200">
                                            <td className="px-4 py-3 font-semibold text-stone-800">{row.label}</td>
                                            {row.values.map((value, index) => (
                                                <td key={`${row.label}-${index}`} className="px-4 py-3 text-slate-600">
                                                    {value}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-12">
                        <div className="section-head !text-start !max-w-none !mb-4">
                            <h2>{copy.pricingFaqTitle}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-serif text-stone-900 mb-3">{copy.pricingFaqOneQuestion}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{copy.pricingFaqOneAnswer}</p>
                            </article>
                            <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-serif text-stone-900 mb-3">{copy.pricingFaqTwoQuestion}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{copy.pricingFaqTwoAnswer}</p>
                            </article>
                            <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-serif text-stone-900 mb-3">{copy.pricingFaqThreeQuestion}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{copy.pricingFaqThreeAnswer}</p>
                            </article>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button size="sm" onClick={() => navigate("/#upload")}>
                            {copy.startBuilding}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate("/")}>
                            {copy.backHome}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
