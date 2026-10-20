// lib/api.ts
// Every call to our backend goes through this file
// No component ever calls fetch() directly

import { useAuthStore } from "@/store/auth.store";

// The base URL of our Express backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
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

    transition: (id: string, status: string) =>
        request<{ incident: Incident }>(`/incidents/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        }),

    join: (id: string) =>
        request<{ message: string }>(`/incidents/${id}/join`, {
            method: "POST",
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
    claim: (taskId: string) =>
        request<{
            outcome: "claimed" | "conflict";
            task?: Task;
            claimedBy?: string;
            claimedAt?: string;
        }>(`/tasks/${taskId}/claim`, {
            method: "POST",
        }),
};

// ─── Types (matching the Prisma schema exactly) ────────────────

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
    version: number;
    createdAt: string;
}

export interface Comment {
    id: string;
    incidentId: string;
    userId: string;
    body: string;
    createdAt: string;
}

export interface Decision {
    id: string;
    incidentId: string;
    madeBy: string;
    decisionText: string;
    reason: string;
    status: string;
    createdAt: string;
}

export interface TimelineEvent {
    id: string;
    incidentId: string;
    type: string;
    actorId: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
}

export interface Responder {
    incidentId: string;
    userId: string;
    joinedAt: string;
    leftAt: string | null;
}