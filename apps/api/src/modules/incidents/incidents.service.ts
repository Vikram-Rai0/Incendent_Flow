// incidents.service.ts
// All incident business logic. Every state change saves to the database,
// then broadcasts to the incident room.

import { IncidentStatus, Severity } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { isValidTransition, getAllowedTransitions } from "./incident.statemachine";
import { broadcastToIncident } from "../../realtime/broadcaster";
import { recordTimelineEvent } from "./timeline.service";
import { loadActors, toActor, withActor } from "./actors";




export async function createIncident(
  title: string,
  description: string,
  severity: Severity,
  createdBy: string
) {
  const incident = await prisma.incident.create({
    data: {
      title,
      description,
      severity,
      createdBy,
      status: "DETECTED",
      // Nested create: the incident and its first responder are saved in ONE
      // database statement. An incident can never exist with nobody on it.
      responders: { create: { userId: createdBy } },
    },
  });

  await recordTimelineEvent(incident.id, "incident.created", createdBy, { title, severity });

  return incident;
}

export async function getIncident(incidentId: string) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      tasks: true,
      comments: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      responders: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!incident) return null;

  // One query loads every person we need to show a name for
const actors = await loadActors([
  ...incident.timelineEvents.map((e) => e.actorId),
  ...incident.comments.map((c) => c.userId),
  ...incident.decisions.map((d) => d.madeBy),
  ...incident.tasks.map((t) => t.claimedBy),   // NEW
]);

  return {
    ...incident,
    timelineEvents: incident.timelineEvents.map((e) => ({
      ...e,
      actor: toActor(actors, e.actorId, incident.commanderId),
    })),
    comments: incident.comments.map((c) => ({
      ...c,
      author: toActor(actors, c.userId, incident.commanderId),
    })),
    decisions: incident.decisions.map((d) => ({
      ...d,
      author: toActor(actors, d.madeBy, incident.commanderId),
    })),
    allowedTransitions: getAllowedTransitions(incident.status),
  };
}

export async function transitionIncident(
  incidentId: string,
  toStatus: IncidentStatus,
  actorId: string,
  note?: string
) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  if (!isValidTransition(incident.status, toStatus)) {
    return {
      outcome: "invalid_transition" as const,
      from: incident.status,
      to: toStatus,
      allowed: getAllowedTransitions(incident.status),
    };
  }

  // Resolving must explain HOW it was resolved. The server enforces this,
  // so the rule holds even if someone bypasses the frontend dialog.
  const resolving = toStatus === "RESOLVED";
  const cleanNote = note?.trim();
  if (resolving && (!cleanNote || cleanNote.length < 10)) {
    return { outcome: "note_required" as const };
  }

  // One transaction: the status change and its timeline entry succeed or fail together.
  const saved = await prisma.$transaction(async (tx) => {
    // Change the status only if it is STILL what we read a moment ago.
    // If someone else changed it in between, count is 0 and we stop.
    const changed = await tx.incident.updateMany({
      where: { id: incidentId, status: incident.status },
      data: {
        status: toStatus,
        resolvedAt: resolving ? new Date() : undefined,
        resolutionNote: resolving ? cleanNote : undefined,
      },
    });
    if (changed.count === 0) return null;

    const event = await tx.timelineEvent.create({
      data: {
        incidentId,
        type: "incident.status_changed",
        actorId,
        payload: {
          from: incident.status,
          to: toStatus,
          ...(resolving ? { note: cleanNote } : {}),
        },
      },
    });
    const updated = await tx.incident.findUniqueOrThrow({ where: { id: incidentId } });
    return { event, updated };
  });

  if (!saved) return { outcome: "conflict" as const };

  const eventWithActor = await withActor(saved.event, incident.commanderId);
  broadcastToIncident(incidentId, "timeline:created", { event: eventWithActor });
  broadcastToIncident(incidentId, "incident:status_changed", {
    incidentId,
    status: toStatus,
    actorId,
  });

  return { outcome: "success" as const, incident: saved.updated };
}

export async function addResponder(incidentId: string, actorId: string, email: string) {
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return { outcome: "user_not_found" as const };

  // skipDuplicates makes this safe to repeat (idempotent).
  // count = 1 → newly added, count = 0 → was already a responder
  const result = await prisma.incidentResponder.createMany({
    data: [{ incidentId, userId: target.id }],
    skipDuplicates: true,
  });

  if (result.count === 0) {
    return { outcome: "already_member" as const };
  }

  // actorId = WHO granted access. This is the audit trail.
  await recordTimelineEvent(incidentId, "responder.added", actorId, {
    userId: target.id,
    name: target.name,
  });
  broadcastToIncident(incidentId, "responder:added", {
    userId: target.id,
    name: target.name,
  });

  return { outcome: "added" as const };
}

export async function addComment(incidentId: string, userId: string, body: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  const comment = await prisma.comment.create({
    data: { incidentId, userId, body },
  });

  const actors = await loadActors([userId]);
  broadcastToIncident(incidentId, "comment:created", {
    comment: { ...comment, author: toActor(actors, userId, incident.commanderId) },
  });

  return { outcome: "success" as const, comment };
}

export async function addDecision(
  incidentId: string,
  userId: string,
  decisionText: string,
  reason: string
) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  const decision = await prisma.decision.create({
    data: { incidentId, madeBy: userId, decisionText, reason },
  });

  await recordTimelineEvent(incidentId, "decision.created", userId, { decisionText });

  const actors = await loadActors([userId]);
  broadcastToIncident(incidentId, "decision:created", {
    decision: { ...decision, author: toActor(actors, userId, incident.commanderId) },
  });

  return { outcome: "success" as const, decision };
}

export async function listIncidents(userId: string, role: string) {
  return prisma.incident.findMany({
    // Admins see everything; everyone else sees only incidents they belong to
    where: role === "ADMIN" ? {} : { responders: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      responders: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      tasks: true,
    },
  });
}

export async function createTask(incidentId: string, title: string, actorId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  const task = await prisma.task.create({
    data: { incidentId, title },
  });

  // The creator is now recorded, so the timeline shows who added the task
  await recordTimelineEvent(incidentId, "task.created", actorId, { title });

broadcastToIncident(incidentId, "task:created", { task: { ...task, claimer: null } });

  return { outcome: "success" as const, task };
}