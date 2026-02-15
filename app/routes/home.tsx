import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, Layers, Share2, Upload as UploadIcon, Wand2} from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import {useNavigate, useOutletContext} from "react-router";
import {type KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import {createProject, getProjects} from "../../lib/puter.action";
import {t, toLocaleDateCode} from "../../lib/i18n";
import {SITE_NAME, SITE_URL} from "../../lib/constants";
import {DEMO_PROJECTS} from "../../lib/demo.projects";

const MAIN_PAGE_LIMIT = 6;

export function meta({}: Route.MetaArgs) {
  const title = `${SITE_NAME} | تبدیل پلان دو بعدی به سه بعدی برای معماران ایران`;
  const description = "پلتفرم فارسی 2d2three برای تبدیل آنلاین پلان دو بعدی به نمای سه بعدی با هوش مصنوعی. مناسب معماران، طراحان داخلی و شرکت های ساختمانی ایران.";
  const ogImage = `${SITE_URL}/og-image.svg`;

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: "تبدیل پلان دو بعدی به سه بعدی, طراحی داخلی با هوش مصنوعی, رندر سه بعدی پلان, نرم افزار معماری فارسی, 2d2three" },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "fa_IR" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: SITE_URL },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export const links: Route.LinksFunction = () => [
  { rel: "canonical", href: SITE_URL },
];

export default function Home() {
    const navigate = useNavigate();
    const { locale, isSignedIn } = useOutletContext<AuthContext>();
    const copy = t[locale];
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isCreatingProjectRef = useRef(false);

    const handleUploadComplete = async (base64Image: string) => {
        try {
            if(isCreatingProjectRef.current) return false;
            isCreatingProjectRef.current = true;
            const newId = Date.now().toString();
            const name = `${copy.projectNamePrefix} ${newId}`;

            const newItem = {
                id: newId,
                name,
                sourceImage: base64Image,
                renderedImage: undefined,
                timestamp: Date.now(),
            };

            const saved = await createProject({ item: newItem, visibility: "private" });

            if(!saved) {
                console.error("Failed to create project");
                return false;
            }

            setProjects((prev) => [saved, ...prev]);

            navigate(`/visualizer/${newId}`, {
                state: {
                    initialImage: saved.sourceImage,
                    initialRendered: saved.renderedImage || null,
                    name,
                },
            });

            return true;
        } finally {
            isCreatingProjectRef.current = false;
        }
    };

    useEffect(() => {
        if (!isSignedIn) {
            setProjects([]);
            setIsLoading(false);
            return;
        }

        const fetchProjects = async () => {
            setIsLoading(true);
            const items = await getProjects();
            setProjects(items);
            setIsLoading(false);
        };

        fetchProjects();
    }, [isSignedIn]);

    const renderedCount = useMemo(
        () => projects.filter((project) => !!project.renderedImage).length,
        [projects],
    );

    const pendingCount = projects.length - renderedCount;

    const visibleProjects = isSignedIn
        ? [...projects].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAIN_PAGE_LIMIT)
        : DEMO_PROJECTS.slice(0, MAIN_PAGE_LIMIT);
    const isDemoMode = !isSignedIn;
    const hasMoreProjects = isSignedIn && projects.length > MAIN_PAGE_LIMIT;

    const pricingPlans = [
        {
            id: "starter",
            name: copy.starterPlan,
            price: "$0",
            highlight: false,
            description: copy.planStarterDesc,
            features: [copy.featurePrivateProjects, copy.featureHistory],
        },
        {
            id: "pro",
            name: copy.proPlan,
            price: "$29",
            highlight: true,
            description: copy.planProDesc,
            features: [copy.featurePrivateProjects, copy.featureFasterRenders, copy.featurePriorityQueue],
        },
    ];
    const workflowSteps = [
        {
            id: "upload",
            icon: UploadIcon,
            title: copy.workflowStepUploadTitle,
            description: copy.workflowStepUploadText,
        },
        {
            id: "render",
            icon: Wand2,
            title: copy.workflowStepRenderTitle,
            description: copy.workflowStepRenderText,
        },
        {
            id: "share",
            icon: Share2,
            title: copy.workflowStepShareTitle,
            description: copy.workflowStepShareText,
        },
    ];

    const openProject = (projectId: string) => {
        navigate(`/visualizer/${projectId}`);
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, projectId: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProject(projectId);
        }
    };

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        inLanguage: "fa-IR",
        url: SITE_URL,
        description: "ابزار فارسی تبدیل پلان دو بعدی به نمای سه بعدی با هوش مصنوعی برای معماران و طراحان داخلی ایران.",
        offers: [
            { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "USD" },
            { "@type": "Offer", name: "Pro", price: "29", priceCurrency: "USD" },
        ],
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: "fa-IR",
        mainEntity: [
            {
                "@type": "Question",
                name: "2d2three چه کاری انجام می دهد؟",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "2d2three پلان دو بعدی را به نمای سه بعدی قابل ارائه تبدیل می کند تا روند طراحی و فروش پروژه سریع تر شود.",
                },
            },
            {
                "@type": "Question",
                name: "آیا 2d2three برای کاربران ایرانی مناسب است؟",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "بله، رابط کاربری فارسی، جهت راست به چپ و محتوای بومی برای معماران و طراحان ایرانی در نظر گرفته شده است.",
                },
            },
            {
                "@type": "Question",
                name: "چه فرمت هایی برای آپلود پشتیبانی می شود؟",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "در حال حاضر فرمت های JPG و PNG تا سقف 50 مگابایت پشتیبانی می شود.",
                },
            },
        ],
    };

  return (
      <div className="home">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          <Navbar />

          <section id="product" className="hero">
              <div className="announce">
                  <div className="dot">
                      <div className="pulse"></div>
                  </div>

                  <p>{copy.heroBadge}</p>
              </div>

              <h1>{copy.heroTitle}</h1>

              <p className="subtitle">
                  {copy.heroSubtitle}
              </p>

              <div className="actions">
                  <a href="#upload" className="cta">
                      {copy.startBuilding} <ArrowRight className="icon" />
                  </a>

                  <a href="#projects" className="demo">
                      {copy.navProjects}
                  </a>
              </div>

              <div id="upload" className="upload-shell">
                <div className="grid-overlay" />

                  <div className="upload-card">
                      <div className="upload-head">
                          <div className="upload-icon">
                              <Layers className="icon" />
                          </div>

                          <h3>{copy.uploadTitle}</h3>
                          <p>{copy.uploadSubtitle}</p>
                      </div>

                      <Upload onComplete={handleUploadComplete} />
                  </div>
              </div>
          </section>

          <section className="workflow" id="workflow">
              <div className="section-inner">
                  <div className="section-head">
                      <h2>{copy.workflowTitle}</h2>
                      <p>{copy.workflowSubtitle}</p>
                  </div>

                  <div className="workflow-grid">
                      {workflowSteps.map(({id, icon: Icon, title, description}) => (
                          <article key={id} className="workflow-card">
                              <div className="step-icon">
                                  <Icon className="icon" />
                              </div>
                              <h3>{title}</h3>
                              <p>{description}</p>
                          </article>
                      ))}
                  </div>
              </div>
          </section>

          <section className="projects" id="projects">
              <div className="section-inner">
                  <div className="section-head">
                      <div className="copy">
                          <h2>{copy.projectsTitle}</h2>
                          <p>{copy.projectsSubtitle}</p>
                      </div>
                      {isSignedIn && (
                          <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>
                              {copy.viewAllProjects}
                          </Button>
                      )}
                  </div>

                  <div className="project-stats">
                      <div className="stat-card">
                          <span>{copy.statsTotal}</span>
                          <strong>{isSignedIn ? projects.length : DEMO_PROJECTS.length}</strong>
                      </div>
                      <div className="stat-card">
                          <span>{copy.statsRendered}</span>
                          <strong>{isSignedIn ? renderedCount : DEMO_PROJECTS.length}</strong>
                      </div>
                      <div className="stat-card">
                          <span>{copy.statsPending}</span>
                          <strong>{isSignedIn ? pendingCount : 0}</strong>
                      </div>
                  </div>

                  <p className="projects-note">
                      {isDemoMode ? copy.signInForProjects : copy.latestProjectsNote}
                  </p>

                  <div className="projects-grid">
                      {isDemoMode ? (
                          visibleProjects.map(({id, name, renderedImage, sourceImage, timestamp}) => (
                              <div
                                  key={id}
                                  className="project-card group"
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${copy.projectLabel}: ${name}`}
                                  onClick={() => openProject(id)}
                                  onKeyDown={(event) => handleCardKeyDown(event, id)}
                              >
                                  <div className="preview">
                                      <img src={renderedImage || sourceImage} alt={copy.projectLabel} loading="lazy" decoding="async" />
                                      <div className="badge">
                                          <span>{copy.demo}</span>
                                      </div>
                                  </div>

                                  <div className="card-body">
                                      <div>
                                          <h3>{name}</h3>
                                          <div className="meta">
                                              <Clock size={12} />
                                              <span>{new Date(timestamp).toLocaleDateString(toLocaleDateCode(locale))}</span>
                                              <span>{copy.byLabel} {copy.designerName}</span>
                                          </div>
                                      </div>
                                      <div className="arrow">
                                          <ArrowUpRight size={18} />
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : isLoading ? (
                          Array.from({ length: 6 }).map((_, index) => (
                              <div key={`skeleton-${index}`} className="project-card skeleton" />
                          ))
                      ) : visibleProjects.length > 0 ? (
                          visibleProjects.map(({id, name, renderedImage, sourceImage, timestamp}) => (
                              <div
                                  key={id}
                                  className="project-card group"
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${copy.projectLabel}: ${name}`}
                                  onClick={() => openProject(id)}
                                  onKeyDown={(event) => handleCardKeyDown(event, id)}
                              >
                                  <div className="preview">
                                      <img src={renderedImage || sourceImage} alt={copy.projectLabel} loading="lazy" decoding="async" />

                                      <div className="badge">
                                          <span>{renderedImage ? copy.filterRendered : copy.filterPending}</span>
                                      </div>
                                  </div>

                                  <div className="card-body">
                                      <div>
                                          <h3>{name}</h3>

                                          <div className="meta">
                                              <Clock size={12} />
                                              <span>{new Date(timestamp).toLocaleDateString(toLocaleDateCode(locale))}</span>
                                              <span>{copy.byLabel} {copy.designerName}</span>
                                          </div>
                                      </div>
                                      <div className="arrow">
                                          <ArrowUpRight size={18} />
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="empty">
                              <p>{copy.noProjects}</p>
                              <a href="#upload">{copy.startBuilding}</a>
                          </div>
                      )}
                  </div>
                  {hasMoreProjects && (
                      <div className="projects-footer">
                          <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>
                              {copy.viewAllProjects}
                          </Button>
                      </div>
                  )}
              </div>
          </section>

          <section id="pricing" className="pricing">
              <div className="section-inner">
                  <div className="section-head">
                      <h2>{copy.pricingTitle}</h2>
                      <p>{copy.pricingSubtitle}</p>
                  </div>

                  <div className="plan-grid">
                      {pricingPlans.map((plan) => (
                          <article key={plan.id} className={`plan-card ${plan.highlight ? "is-highlighted" : ""}`}>
                              {plan.highlight && <span className="plan-badge">{copy.popular}</span>}
                              <h3>{plan.name}</h3>
                              <p className="desc">{plan.description}</p>
                              <p className="price">
                                  <strong>{plan.price}</strong>
                                  <span>{plan.price === copy.planCustom ? "" : `/${copy.pricingMonthly}`}</span>
                              </p>

                              <ul className="features">
                                  {plan.features.map((feature) => (
                                      <li key={feature}>{feature}</li>
                                  ))}
                              </ul>

                              <Button size="sm" className="plan-cta">{copy.planCta}</Button>
                          </article>
                      ))}
                  </div>
              </div>
          </section>

          <section id="community" className="community">
              <div className="section-inner">
                  <div className="section-head">
                      <h2>{copy.communityTitle}</h2>
                      <p>{copy.communitySubtitle}</p>
                  </div>

                  <div className="community-grid">
                      <article className="community-card">
                          <h3>{copy.communityItemOneTitle}</h3>
                          <p>{copy.communityItemOneText}</p>
                      </article>
                      <article className="community-card">
                          <h3>{copy.communityItemTwoTitle}</h3>
                          <p>{copy.communityItemTwoText}</p>
                      </article>
                      <article className="community-card">
                          <h3>{copy.communityItemThreeTitle}</h3>
                          <p>{copy.communityItemThreeText}</p>
                      </article>
                  </div>
              </div>
          </section>

          <section className="faq" id="faq">
              <div className="section-inner">
                  <div className="section-head">
                      <h2>{copy.faqTitle}</h2>
                      <p>{copy.faqSubtitle}</p>
                  </div>

                  <div className="faq-list">
                      <article className="faq-item">
                          <h3>{copy.faqOneQuestion}</h3>
                          <p>{copy.faqOneAnswer}</p>
                      </article>
                      <article className="faq-item">
                          <h3>{copy.faqTwoQuestion}</h3>
                          <p>{copy.faqTwoAnswer}</p>
                      </article>
                      <article className="faq-item">
                          <h3>{copy.faqThreeQuestion}</h3>
                          <p>{copy.faqThreeAnswer}</p>
                      </article>
                  </div>
              </div>
          </section>

          <footer className="site-footer">
              <div className="section-inner">
                  <p>{copy.footerCaption}</p>
              </div>
          </footer>
      </div>
  )
}
