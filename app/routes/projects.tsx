import type { Route } from "./+types/projects";
import {ArrowUpRight, Clock, CopyPlus, Search, Trash2} from "lucide-react";
import Navbar from "../../components/Navbar";
import Button from "../../components/ui/Button";
import {type KeyboardEvent, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useOutletContext} from "react-router";
import {createProject, deleteProjectById, getProjects} from "../../lib/puter.action";
import {t, toLocaleDateCode} from "../../lib/i18n";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "همه پروژه ها | 2d2three" },
        { name: "description", content: "نمای کامل پروژه های کاربر در 2d2three" },
        { name: "robots", content: "noindex, nofollow" },
    ];
}

type ProjectFilter = "all" | "rendered" | "pending";
type ProjectSort = "newest" | "oldest" | "name";

export default function Projects() {
    const navigate = useNavigate();
    const { locale, isSignedIn, signIn } = useOutletContext<AuthContext>();
    const copy = t[locale];

    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<ProjectFilter>("all");
    const [sort, setSort] = useState<ProjectSort>("newest");
    const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

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

    const openProject = (projectId: string) => {
        navigate(`/visualizer/${projectId}`);
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, projectId: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProject(projectId);
        }
    };

    if (!isSignedIn) {
        return (
            <div className="home projects-page">
                <Navbar />
                <section className="projects">
                    <div className="section-inner">
                        <div className="projects-grid">
                            <div className="empty">
                                <p>{copy.signInForProjects}</p>
                                <p className="projects-note">{copy.projectsGuideSignedOut}</p>
                                <div className="flex items-center justify-center gap-2">
                                    <Button size="sm" onClick={() => void signIn()}>{copy.logIn}</Button>
                                    <Link to="/#projects">{copy.watchDemo}</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="home projects-page">
            <Navbar />

            <section className="projects">
                <div className="section-inner">
                    <div className="section-head">
                        <div className="copy">
                            <h2>{copy.allProjectsTitle}</h2>
                            <p>{copy.allProjectsSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => navigate("/#upload")}>{copy.startBuilding}</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate("/")}>{copy.backHome}</Button>
                        </div>
                    </div>

                    <p className="projects-note">{copy.projectsGuideSignedIn}</p>

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
                            Array.from({ length: 8 }).map((_, index) => (
                                <div key={`skeleton-${index}`} className="project-card skeleton" />
                            ))
                        ) : filteredProjects.length > 0 ? (
                            filteredProjects.map(({id, name, renderedImage, sourceImage, timestamp}) => (
                                <div
                                    key={id}
                                    className="project-card group"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${copy.projectLabel}: ${name || id}`}
                                    onClick={() => openProject(id)}
                                    onKeyDown={(event) => handleCardKeyDown(event, id)}
                                >
                                    <div className="preview">
                                        <img src={renderedImage || sourceImage} alt={copy.projectLabel} loading="lazy" decoding="async" />

                                        <div className="badge">
                                            <span>{renderedImage ? copy.filterRendered : copy.filterPending}</span>
                                        </div>

                                        <div className="card-actions">
                                            <button
                                                type="button"
                                                aria-label={`${copy.duplicate} ${name || id}`}
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
                                                aria-label={`${copy.delete} ${name || id}`}
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
        </div>
    );
}
