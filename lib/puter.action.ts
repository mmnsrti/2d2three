import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";

const PROJECT_PREFIX = "roomify_project_";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

const projectKey = (id: string) => `${PROJECT_PREFIX}${id}`;

const normalizeProject = (item: unknown): DesignItem | null => {
    if (!item || typeof item !== "object") return null;

    const candidate = item as Partial<DesignItem>;
    if (!candidate.id || !candidate.sourceImage) return null;

    return {
        ...candidate,
        id: String(candidate.id),
        sourceImage: String(candidate.sourceImage),
        timestamp: Number(candidate.timestamp || Date.now()),
        name: candidate.name ?? `Residence ${candidate.id}`,
    };
};

const listProjectsFromLocal = async (): Promise<DesignItem[]> => {
    try {
        const result = await puter.kv.list<DesignItem>(PROJECT_PREFIX, true);
        const pairs = Array.isArray(result)
            ? result
            : Array.isArray((result as { items?: unknown[] })?.items)
                ? ((result as { items: Array<{ key: string; value: DesignItem }> }).items)
                : [];

        return pairs
            .map(({ value }) => normalizeProject(value))
            .filter((value): value is DesignItem => !!value)
            .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.warn("Failed to list projects from local cache", error);
        return [];
    }
};

const getProjectFromLocal = async (id: string): Promise<DesignItem | null> => {
    try {
        const cached = await puter.kv.get<DesignItem>(projectKey(id));
        return normalizeProject(cached);
    } catch (error) {
        console.warn("Failed to read project from local cache", error);
        return null;
    }
};

const cacheProjectLocal = async (project: DesignItem | null | undefined) => {
    const normalized = normalizeProject(project);
    if (!normalized) return null;

    try {
        await puter.kv.set(projectKey(normalized.id), normalized);
    } catch (error) {
        console.warn("Failed to cache project locally", error);
    }

    return normalized;
};

const cacheProjectsLocal = async (projects: DesignItem[]) => {
    await Promise.all(projects.map((project) => cacheProjectLocal(project)));
};

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig();

    const hostedSource = projectId ?
        await uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: 'source', }) : null;

    const hostedRender = projectId && item.renderedImage ?
        await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: 'rendered', }) : null;

    const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)
        ? item.sourceImage
        : ''
    );

    if(!resolvedSource) {
        console.warn('Failed to host source image, skipping save.')
        return null;
    }

    const resolvedRender = hostedRender?.url
        ? hostedRender?.url
        : item.renderedImage && isHostedUrl(item.renderedImage)
            ? item.renderedImage
            : undefined;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest
    } = item;

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
    }

    const fallbackProject = await cacheProjectLocal({
        ...payload,
        timestamp: payload.timestamp || Date.now(),
        isPublic: visibility === "public",
    });

    if(!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; saved project to local cache only.");
        return fallbackProject;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
            method: 'POST',
            body: JSON.stringify({
                project: payload,
                visibility
            })
        });

        if(!response.ok) {
            console.error('failed to save the project', await response.text());
            return fallbackProject;
        }

        const data = (await response.json()) as { project?: DesignItem | null }
        const savedProject = normalizeProject(data?.project) || fallbackProject;

        if (savedProject) {
            await cacheProjectLocal(savedProject);
        }

        return savedProject;
    } catch (e) {
        console.error("Failed to save project in worker, using local cache.", e);
        return fallbackProject;
    }
}

export const getProjects = async () => {
    if(!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; loading history from local cache.");
        return await listProjectsFromLocal();
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
            console.error('Failed to fetch history', await response.text());
            return await listProjectsFromLocal();
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };
        const projects = Array.isArray(data?.projects)
            ? data.projects
                .map((item) => normalizeProject(item))
                .filter((value): value is DesignItem => !!value)
            : [];

        await cacheProjectsLocal(projects);

        return projects;
    } catch (e) {
        console.error("Failed to get projects from worker, using local cache.", e);
        return await listProjectsFromLocal();
    }
}

export const getProjectById = async ({ id }: { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; loading project from local cache.");
        return await getProjectFromLocal(id);
    }

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return await getProjectFromLocal(id);
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };
        const project = normalizeProject(data?.project);

        if (project) {
            await cacheProjectLocal(project);
        }

        return project;
    } catch (error) {
        console.error("Failed to fetch project from worker, using local cache.", error);
        return await getProjectFromLocal(id);
    }
};
