import type { Route } from "./+types/visualizer.$id";
import { useNavigate, useOutletContext, useParams} from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../lib/ai.action";
import {Download, Minus, Plus, RefreshCcw, RotateCw, Share2, X} from "lucide-react";
import Button from "../../components/ui/Button";
import Navbar from "../../components/Navbar";
import {createProject, getProjectById} from "../../lib/puter.action";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";
import {t} from "../../lib/i18n";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

export function meta({ params }: Route.MetaArgs) {
    return [
        { title: `پروژه ${params.id || ""} | 2d2three` },
        { name: "description", content: "صفحه مدیریت و رندر پروژه در 2d2three" },
        { name: "robots", content: "noindex, nofollow" },
    ];
}

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId, locale } = useOutletContext<AuthContext>()
    const copy = t[locale];

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);

    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
    const renderAreaRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef(MIN_ZOOM);
    const panRef = useRef({ x: 0, y: 0 });
    const panGestureRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    } | null>(null);

    const handleBack = () => navigate('/');

    const getRenderBounds = () => {
        const rect = renderAreaRef.current?.getBoundingClientRect();
        if (!rect) return null;

        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
        };
    };

    const clampPan = (candidate: { x: number; y: number }, zoomLevel: number) => {
        const bounds = getRenderBounds();
        if (!bounds || zoomLevel <= MIN_ZOOM) {
            return { x: 0, y: 0 };
        }

        const maxX = ((zoomLevel - 1) * bounds.width) / 2;
        const maxY = ((zoomLevel - 1) * bounds.height) / 2;

        return {
            x: Math.max(-maxX, Math.min(maxX, candidate.x)),
            y: Math.max(-maxY, Math.min(maxY, candidate.y)),
        };
    };

    const resetViewport = () => {
        zoomRef.current = MIN_ZOOM;
        panRef.current = { x: 0, y: 0 };
        panGestureRef.current = null;
        setIsPanning(false);
        setZoom(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
    };

    const applyZoom = (targetZoom: number, focalPoint?: { x: number; y: number }) => {
        const previousZoom = zoomRef.current;
        const safeZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(targetZoom.toFixed(2))));
        const bounds = getRenderBounds();
        const previousPan = panRef.current;

        let nextPan = previousPan;

        if (bounds) {
            const focus = focalPoint || { x: bounds.width / 2, y: bounds.height / 2 };
            const focusX = focus.x - bounds.width / 2;
            const focusY = focus.y - bounds.height / 2;
            const ratio = safeZoom / previousZoom;

            nextPan = {
                x: focusX - ratio * (focusX - previousPan.x),
                y: focusY - ratio * (focusY - previousPan.y),
            };
        }

        const clampedPan = clampPan(nextPan, safeZoom);

        zoomRef.current = safeZoom;
        panRef.current = clampedPan;
        setZoom(safeZoom);
        setPan(clampedPan);

        if (safeZoom <= MIN_ZOOM) {
            setIsPanning(false);
            panGestureRef.current = null;
        }
    };

    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement("a");
        link.href = currentImage;
        link.download = `2d2three-${id || "design"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (typeof window === "undefined" || !id) return;

        try {
            const shareUrl = `${window.location.origin}/visualizer/${id}`;
            await navigator.clipboard.writeText(shareUrl);
            setShareStatus("copied");
        } catch {
            setShareStatus("error");
        } finally {
            window.setTimeout(() => setShareStatus("idle"), 1500);
        }
    };

    const handleRegenerate = () => {
        if (!project?.sourceImage || isProcessing) return;
        hasInitialGenerated.current = true;
        void runGeneration(project);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!currentImage || zoomRef.current <= MIN_ZOOM) return;

        panGestureRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: panRef.current.x,
            originY: panRef.current.y,
        };
        setIsPanning(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const gesture = panGestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        const nextPan = clampPan({
            x: gesture.originX + (event.clientX - gesture.startX),
            y: gesture.originY + (event.clientY - gesture.startY),
        }, zoomRef.current);

        panRef.current = nextPan;
        setPan(nextPan);
    };

    const finishPanning = (event: React.PointerEvent<HTMLDivElement>) => {
        const gesture = panGestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        panGestureRef.current = null;
        setIsPanning(false);
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!currentImage) return;

        const bounds = getRenderBounds();
        if (!bounds) return;

        applyZoom(zoomRef.current + ZOOM_STEP, {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        });
    };

    const runGeneration = async (item: DesignItem) => {
        if(!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if(result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if(saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        } catch (error) {
            console.error("Generation failed: ", error)
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            setProject(fetchedProject);
            setCurrentImage(fetchedProject?.renderedImage || null);
            resetViewport();
            setShareStatus("idle");
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        ) {
            return;
        }

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    const shareLabel = shareStatus === "copied"
        ? copy.shareCopied
        : shareStatus === "error"
            ? copy.shareFailed
            : copy.share;
    const isZoomed = zoom > MIN_ZOOM;

    if (!isProjectLoading && !project) {
        return (
            <div className="visualizer">
                <Navbar />
                <div className="visualizer-route">
                    <div className="panel not-found">
                        <div className="panel-header">
                            <div className="panel-meta">
                                <h2>{copy.projectNotFound}</h2>
                                <p className="note">#{id}</p>
                            </div>
                            <Button size="sm" onClick={handleBack}>{copy.backHome}</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="visualizer">
            <Navbar />

            <section className="content visualizer-content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>{copy.projectLabel}</p>
                            <h2>{project?.name || `${copy.projectNamePrefix} ${id}`}</h2>
                            <p className="note">
                                {isProcessing ? copy.rendering : currentImage ? copy.renderReady : copy.createdByYou}
                            </p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleBack}
                                className="exit"
                            >
                                <X className="w-4 h-4 mr-2" />
                                {copy.exitEditor}
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> {copy.export}
                            </Button>
                            <Button size="sm" onClick={handleShare} className="share">
                                <Share2 className="w-4 h-4 mr-2" />
                                {shareLabel}
                            </Button>
                        </div>
                    </div>

                    <div
                        ref={renderAreaRef}
                        className={`render-area ${isProcessing ? "is-processing": ""}`}
                    >
                        {currentImage ? (
                            <div
                                className={`render-stage ${isZoomed ? "is-zoomed" : ""} ${isPanning ? "is-panning" : ""}`}
                                style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={finishPanning}
                                onPointerCancel={finishPanning}
                                onDoubleClick={handleDoubleClick}
                            >
                                <img src={currentImage} alt={copy.aiRenderAlt} className="render-img" />
                            </div>
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project?.sourceImage} alt={copy.originalAlt} className="render-fallback" />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">{copy.rendering}</span>
                                    <span className="subtitle">{copy.generating}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="render-controls">
                        <Button size="sm" variant="outline" className="control" onClick={handleRegenerate} disabled={isProcessing || !project?.sourceImage}>
                            <RotateCw className="w-4 h-4" />
                            {copy.regenerate}
                        </Button>

                        <div className="zoom-group">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="control"
                                onClick={() => applyZoom(zoomRef.current - ZOOM_STEP)}
                                disabled={zoom <= MIN_ZOOM}
                            >
                                <Minus className="w-4 h-4" />
                                {copy.zoomOut}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="control"
                                onClick={() => applyZoom(zoomRef.current + ZOOM_STEP)}
                                disabled={zoom >= MAX_ZOOM}
                            >
                                <Plus className="w-4 h-4" />
                                {copy.zoomIn}
                            </Button>
                            <Button size="sm" variant="ghost" className="control" onClick={resetViewport}>
                                {copy.resetZoom}
                            </Button>
                        </div>

                        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                        <span className="zoom-hint">{copy.zoomHint}</span>
                    </div>
                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>{copy.comparison}</p>
                            <h3>{copy.beforeAfter}</h3>
                        </div>
                        <div className="hint">{copy.dragToCompare}</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: "100%", height: "auto" }}
                                itemOne={
                                    <ReactCompareSliderImage src={project?.sourceImage} alt={copy.beforeAlt} className="compare-img" />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage src={currentImage} alt={copy.afterAlt} className="compare-img" />
                                }
                            />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt={copy.beforeAlt} className="compare-img" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
export default VisualizerId
