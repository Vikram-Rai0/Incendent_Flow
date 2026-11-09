// Every call to our backend goes through this file
// No component ever calls fetch() directly

import { useAuthStore } from "@/store/auth.store";

// The base URL of our Express backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// An error that remembers the HTTP status code 
export class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body?: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

// This function makes every HTTP request
// It automatically attaches the auth token if we have one
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Get the current token from the auth store
    const token = useAuthStore.getState().accessToken;

    // Build the full request
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        // credentials: "include" makes the browser send cookies automatically
        // This is how the refresh token cookie gets sent to /auth/refresh
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            // Only add the Authorization header if we have a token
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    // If the response is not OK (status 400, 401, 404, 500 etc)
    // throw an error so the calling code knows something went wrong
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new ApiError(errorBody.error || `Request failed with status ${response.status}`, response.status, errorBody);
    }

    return response.json();
}

// ─── Auth API calls ────────────────────────────────────────────

export const authApi = {
    register: (email: string, password: string, name: string) =>
        request<{ user: User }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
        }),

    login: (email: string, password: string) =>
        request<{ accessToken: string; user: User }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    // Uses the httpOnly cookie automatically — no token needed
    refresh: () =>
        request<{ accessToken: string; user: User }>("/auth/refresh", {
            method: "POST",
        }),

    logout: () =>
        request<{ message: string }>("/auth/logout", {
            method: "POST",
        }),
};

// ─── Incidents API calls ───────────────────────────────────────

export const incidentsApi = {
    list: () =>
        request<{ incidents: Incident[] }>("/incidents"),

    get: (id: string) =>
        request<{ incident: Incident }>(`/incidents/${id}`),

    create: (title: string, description: string, severity: string) =>
        request<{ incident: Incident }>("/incidents", {
            method: "POST",
            body: JSON.stringify({ title, description, severity }),
        }),

    transition: (id: string, status: string, note?: string) =>
        request<{ incident: Incident }>(`/incidents/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status, note }), // note is left out when undefined
        }),

    getSummary: (id: string) =>
        request<{ summary: IncidentSummary }>(`/incidents/${id}/summary`),

    addResponder: (id: string, email: string) =>
        request<{ message: string }>(`/incidents/${id}/responders`, {
            method: "POST",
            body: JSON.stringify({ email }),
        }),

    addComment: (id: string, body: string) =>
        request<{ comment: Comment }>(`/incidents/${id}/comments`, {
            method: "POST",
            body: JSON.stringify({ body }),
        }),

    addDecision: (id: string, decisionText: string, reason: string) =>
        request<{ decision: Decision }>(`/incidents/${id}/decisions`, {
            method: "POST",
            body: JSON.stringify({ decisionText, reason }),
        }),

    createTask: (id: string, title: string) =>
        request<{ task: Task }>(`/incidents/${id}/tasks`, {
            method: "POST",
            body: JSON.stringify({ title }),
        }),
};

// ─── Tasks API calls ───────────────────────────────────────────
export const tasksApi = {
    claim: async (taskId: string): Promise<ClaimResult> => {
        try {
            return await request<ClaimResult>(`/tasks/${taskId}/claim`, { method: "POST" });
        } catch (err) {
            // 409 is an EXPECTED outcome (we lost the race), not a failure.
            // Hand the server's explanation back to the UI instead of throwing.
            if (err instanceof ApiError && err.status === 409) return err.body as ClaimResult;
            throw err;
        }
    },

    complete: (taskId: string) =>
        request<{ task: Task }>(`/tasks/${taskId}/complete`, { method: "POST" }),
};
// ─── Types (matching the Prisma schema exactly) ────────────────
export interface ActorInfo {
    name: string;
    role: string; // "Incident Commander" | "Admin" | "Responder"
}
export interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "RESPONDER";
    createdAt: string;
}

export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
    status: IncidentStatus;
    commanderId: string | null;
    createdBy: string;
    createdAt: string;
    resolvedAt: string | null;
    tasks: Task[];
    comments: Comment[];
    decisions: Decision[];
    timelineEvents: TimelineEvent[];
    responders: Responder[];
    allowedTransitions: IncidentStatus[];
    resolutionNote: string | null;
}

export interface IncidentSummary {
    incidentId: string;
    title: string;
    severity: Incident["severity"];
    status: IncidentStatus;
    inProgress: boolean;
    startedAt: string;
    resolvedAt: string | null;
    durationMs: number;
    timeToAcknowledgeMs: number | null;
    commander: string | null;
    resolution: string | null;
    phases: { status: string; durationMs: number }[];
    counts: { tasks: number; tasksCompleted: number; decisions: number; comments: number };
    people: {
        userId: string;
        name: string;
        isCommander: boolean;
        tasksCompleted: number;
        comments: number;
        decisions: number;
    }[];
    decisions: { decisionText: string; reason: string; madeBy: string | null; createdAt: string }[];
}

export type IncidentStatus =
    | "DETECTED"
    | "ACKNOWLEDGED"
    | "INVESTIGATING"
    | "IDENTIFIED"
    | "MITIGATING"
    | "RESOLVED"
    | "CLOSED";

export interface Task {
    id: string;
    incidentId: string;
    title: string;
    status: "UNCLAIMED" | "CLAIMED" | "COMPLETED";
    claimedBy: string | null;
    claimedAt: string | null;
    completedAt: string | null;
    claimer: { name: string; role: string } | null;
    version: number;
    createdAt: string;
}

export interface ClaimResult {
    outcome: "claimed" | "conflict";
    task: Task;
    message?: string;
}

export interface Comment {
    id: string;
    incidentId: string;
    userId: string;
    body: string;
    createdAt: string;
    author?: ActorInfo | null;
}

export interface Decision {
    id: string;
    incidentId: string;
    madeBy: string;
    decisionText: string;
    reason: string;
    status: string;
    createdAt: string;
    author?: ActorInfo | null;
}

export interface TimelineEvent {
    id: string;
    incidentId: string;
    type: string;
    actorId: string | null;
    actor: { name: string; role: string } | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
}
export interface Responder {
    incidentId: string;
    userId: string;
    joinedAt: string;
    leftAt: string | null;
    user: { id: string; name: string; email: string };
}