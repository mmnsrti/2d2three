import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, CopyPlus, Layers, Search, Trash2} from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import {useNavigate, useOutletContext} from "react-router";
import {useEffect, useMemo, useRef, useState} from "react";
import {createProject, deleteProjectById, getProjects} from "../../lib/puter.action";
import {t, toLocaleDateCode} from "../../lib/i18n";
import {SITE_NAME, SITE_URL} from "../../lib/constants";

type ProjectFilter = "all" | "rendered" | "pending";
type ProjectSort = "newest" | "oldest" | "name";

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
    const { locale } = useOutletContext<AuthContext>();
    const copy = t[locale];
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<ProjectFilter>("all");
    const [sort, setSort] = useState<ProjectSort>("newest");
    const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
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
        const fetchProjects = async () => {
            setIsLoading(true);
            const items = await getProjects();
            setProjects(items);
            setIsLoading(false);
        };

        fetchProjects();
    }, []);

    const renderedCount = useMemo(
        () => projects.filter((project) => !!project.renderedImage).length,
        [projects],
    );

    const pendingCount = projects.length - renderedCount;

    const filteredProjects = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();

        const matched = projects.filter((project) => {
            const name = (project.name || "").toLowerCase();
            const id = project.id.toLowerCase();
            const matchesQuery = !trimmedQuery || name.includes(trimmedQuery) || id.includes(trimmedQuery);

            if (!matchesQuery) return false;
            if (filter === "rendered") return !!project.renderedImage;
            if (filter === "pending") return !project.renderedImage;
            return true;
        });

        return matched.sort((a, b) => {
            if (sort === "name") return (a.name || "").localeCompare(b.name || "");
            if (sort === "oldest") return a.timestamp - b.timestamp;
            return b.timestamp - a.timestamp;
        });
    }, [projects, query, filter, sort]);

    const handleDelete = async (projectId: string) => {
        if (!window.confirm(copy.deleteConfirm)) return;

        setBusyProjectId(projectId);
        try {
            const deleted = await deleteProjectById({ id: projectId });
            if (deleted) {
                setProjects((prev) => prev.filter((project) => project.id !== projectId));
            }
        } finally {
            setBusyProjectId(null);
        }
    };

    const handleDuplicate = async (project: DesignItem) => {
        const newId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const duplicateName = `${project.name || `${copy.projectNamePrefix} ${newId}`} (${copy.duplicate})`;

        setBusyProjectId(project.id);
        try {
            const duplicated = await createProject({
                item: {
                    ...project,
                    id: newId,
                    name: duplicateName,
                    timestamp: Date.now(),
                    isPublic: false,
                },
                visibility: "private",
            });

            if (duplicated) {
                setProjects((prev) => [duplicated, ...prev]);
            }
        } finally {
            setBusyProjectId(null);
        }
    };

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

                  <Button variant="outline" size="lg" className="demo">
                      {copy.watchDemo}
                  </Button>
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

          <section className="projects">
              <div className="section-inner">
                  <div className="section-head">
                      <div className="copy">
                          <h2>{copy.projectsTitle}</h2>
                          <p>{copy.projectsSubtitle}</p>
                      </div>
                  </div>

                  <div className="project-tools">
                      <div className="search-box">
                          <Search size={16} />
                          <input
                              value={query}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder={copy.searchProjects}
                          />
                      </div>

                      <div className="select-group">
                          <label>{copy.filterLabel}</label>
                          <select
                              value={filter}
                              onChange={(event) => setFilter(event.target.value as ProjectFilter)}
                          >
                              <option value="all">{copy.filterAll}</option>
                              <option value="rendered">{copy.filterRendered}</option>
                              <option value="pending">{copy.filterPending}</option>
                          </select>
                      </div>

                      <div className="select-group">
                          <label>{copy.sortLabel}</label>
                          <select
                              value={sort}
                              onChange={(event) => setSort(event.target.value as ProjectSort)}
                          >
                              <option value="newest">{copy.sortNewest}</option>
                              <option value="oldest">{copy.sortOldest}</option>
                              <option value="name">{copy.sortName}</option>
                          </select>
                      </div>
                  </div>

                  <div className="project-stats">
                      <div className="stat-card">
                          <span>{copy.statsTotal}</span>
                          <strong>{projects.length}</strong>
                      </div>
                      <div className="stat-card">
                          <span>{copy.statsRendered}</span>
                          <strong>{renderedCount}</strong>
                      </div>
                      <div className="stat-card">
                          <span>{copy.statsPending}</span>
                          <strong>{pendingCount}</strong>
                      </div>
                  </div>

                  <div className="projects-grid">
                      {isLoading ? (
                          Array.from({ length: 6 }).map((_, index) => (
                              <div key={`skeleton-${index}`} className="project-card skeleton" />
                          ))
                      ) : filteredProjects.length > 0 ? (
                          filteredProjects.map(({id, name, renderedImage, sourceImage, timestamp}) => (
                              <div key={id} className="project-card group" onClick={() => navigate(`/visualizer/${id}`)}>
                                  <div className="preview">
                                      <img src={renderedImage || sourceImage} alt={copy.projectLabel} />

                                      <div className="badge">
                                          <span>{renderedImage ? copy.filterRendered : copy.filterPending}</span>
                                      </div>

                                      <div className="card-actions">
                                          <button
                                              type="button"
                                              title={copy.duplicate}
                                              disabled={busyProjectId === id}
                                              onClick={(event) => {
                                                  event.stopPropagation();
                                                  void handleDuplicate({ id, name, renderedImage, sourceImage, timestamp });
                                              }}
                                          >
                                              <CopyPlus size={14} />
                                          </button>
                                          <button
                                              type="button"
                                              title={copy.delete}
                                              disabled={busyProjectId === id}
                                              onClick={(event) => {
                                                  event.stopPropagation();
                                                  void handleDelete(id);
                                              }}
                                          >
                                              <Trash2 size={14} />
                                          </button>
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
                              <p>{projects.length === 0 ? copy.noProjects : copy.noResults}</p>
                              {(query || filter !== "all") && (
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setQuery("");
                                          setFilter("all");
                                          setSort("newest");
                                      }}
                                  >
                                      {copy.resetFilters}
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
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
                      <h2>سوالات متداول</h2>
                      <p>پاسخ سریع به سوالات رایج کاربران ایرانی</p>
                  </div>

                  <div className="faq-list">
                      <article className="faq-item">
                          <h3>2d2three چه کاری انجام می دهد؟</h3>
                          <p>این پلتفرم پلان های دو بعدی را به خروجی سه بعدی قابل ارائه تبدیل می کند.</p>
                      </article>
                      <article className="faq-item">
                          <h3>برای استفاده نیاز به نصب نرم افزار داریم؟</h3>
                          <p>خیر، همه چیز تحت وب است و از طریق مرورگر کار می کند.</p>
                      </article>
                      <article className="faq-item">
                          <h3>این ابزار برای چه کسانی مناسب است؟</h3>
                          <p>معماران، طراحان داخلی، مشاوران املاک و تیم های ساختمانی که نیاز به خروجی سریع دارند.</p>
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
