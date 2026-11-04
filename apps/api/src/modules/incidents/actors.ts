// actors.ts
// ONE place that turns a user id into { name, role } for display.
// The snapshot AND the live broadcasts both use it, so they have the same shape.

import { prisma } from "../../db/prisma";

type ActorUser = { id: string; name: string; role: string };
export type ActorInfo = { name: string; role: string };

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    RESPONDER: "Responder",
};

// Look up many users in ONE query. Returns a Map of id -> user.
export async function loadActors(ids: (string | null | undefined)[]) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    const map = new Map<string, ActorUser>();
    if (unique.length === 0) return map;

    const users = await prisma.user.findMany({
        where: { id: { in: unique } },
        select: { id: true, name: true, role: true },
    });
    for (const u of users) map.set(u.id, u);
    return map;
}

// Build the display object for one user id (null = system event or unknown user)
export function toActor(
    actors: Map<string, ActorUser>,
    userId: string | null,
    commanderId?: string | null
): ActorInfo | null {
    const user = userId ? actors.get(userId) : undefined;
    if (!user) return null;

    return {
        name: user.name,
        role:
            userId === commanderId
                ? "Incident Commander"
                : ROLE_LABELS[user.role] ?? "Responder",
    };
}

// Convenience for a single event: look up its actor and attach it
export async function withActor<T extends { actorId: string | null }>(
    event: T,
    commanderId?: string | null
) {
    const actors = await loadActors([event.actorId]);
    return { ...event, actor: toActor(actors, event.actorId, commanderId) };
}