import type { Route } from "./+types/pricing";
import Navbar from "../../components/Navbar";
import Button from "../../components/ui/Button";
import {useNavigate, useOutletContext} from "react-router";
import {t, toLocaleDateCode} from "../../lib/i18n";
import {SITE_NAME, SITE_URL} from "../../lib/constants";

type PricingPlan = {
    id: string;
    name: string;
    priceToman: number;
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

    const plans: PricingPlan[] = [
        {
            id: "starter",
            name: copy.starterPlan,
            priceToman: 0,
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
            priceToman: 790000,
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
            priceToman: 1490000,
            description: copy.planAgencyDesc,
            features: [copy.featureDedicatedWorker, copy.featurePrioritySupport, copy.featureTeamWorkspace, copy.featureHistory],
            bestFor: copy.planAgencyBestFor,
            renders: copy.planAgencyRenders,
            storage: copy.planAgencyStorage,
            queue: copy.planAgencyQueue,
            support: copy.planAgencySupport,
        },
    ];

    const compareRows = [
        { label: copy.pricingRowPrice, values: plans.map((plan) => `${formatToman(plan.priceToman)} ${copy.pricingCurrency}`) },
        { label: copy.pricingRowRenders, values: plans.map((plan) => plan.renders) },
        { label: copy.pricingRowStorage, values: plans.map((plan) => plan.storage) },
        { label: copy.pricingRowQueue, values: plans.map((plan) => plan.queue) },
        { label: copy.pricingRowSupport, values: plans.map((plan) => plan.support) },
        { label: copy.pricingRowBestFor, values: plans.map((plan) => plan.bestFor) },
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

                    <div className="plan-grid">
                        {plans.map((plan) => (
                            <article key={plan.id} className={`plan-card ${plan.highlight ? "is-highlighted" : ""}`}>
                                {plan.highlight && <span className="plan-badge">{copy.popular}</span>}
                                <h3>{plan.name}</h3>
                                <p className="desc">{plan.description}</p>
                                <p className="price">
                                    <strong>{formatToman(plan.priceToman)}</strong>
                                    <span>{copy.pricingCurrency} / {copy.pricingMonthly}</span>
                                </p>

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
