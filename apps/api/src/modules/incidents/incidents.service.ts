import { IncidentStatus, Severity } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { isValidTransition, getAllowedTransitions } from "./incident.statemachine";

export async function createIncident(
  title: string,
  description: string,
  severity: Severity,
  createdBy: string
) {
  const incident = await prisma.incident.create({
    data: { title, description, severity, createdBy, status: "DETECTED" },
  });

  // First timeline event - automatic, no user action needed
  await prisma.timelineEvent.create({
    data: {
      incidentId: incident.id,
      type: "incident.created",
      actorId: createdBy,
      payload: { title, severity },
    },
  });

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
      responders: true,
    },
  });

  if (!incident) return null;

  return {
    ...incident,
    allowedTransitions: getAllowedTransitions(incident.status),
  };
}

export async function transitionIncident(
  incidentId: string,
  toStatus: IncidentStatus,
  actorId: string
) {
  // Read current status first
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    return { outcome: "not_found" as const };
  }

  if (!isValidTransition(incident.status, toStatus)) {
    return {
      outcome: "invalid_transition" as const,
      from: incident.status,
      to: toStatus,
      allowed: getAllowedTransitions(incident.status),
    };
  }

  // Valid transition - update status and write timeline event atomically
  const [updated] = await prisma.$transaction([
    prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: toStatus,
        resolvedAt: toStatus === "RESOLVED" ? new Date() : undefined,
      },
    }),
    prisma.timelineEvent.create({
      data: {
        incidentId,
        type: "incident.status_changed",
        actorId,
        payload: { from: incident.status, to: toStatus },
      },
    }),
  ]);

  return { outcome: "success" as const, incident: updated };
}


export async function joinIncident(incidentId: string, userId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  // upsert prevents duplicate responder rows
  await prisma.incidentResponder.upsert({
    where: { incidentId_userId: { incidentId, userId } },
    update: { leftAt: null }, // rejoining clears leftAt
    create: { incidentId, userId },
  });

  await prisma.timelineEvent.create({
    data: {
      incidentId,
      type: "responder.joined",
      actorId: userId,
      payload: {},
    },
  });

  return { outcome: "success" as const };
}

export async function addComment(incidentId: string, userId: string, body: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  const comment = await prisma.comment.create({
    data: { incidentId, userId, body },
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

  await prisma.timelineEvent.create({
    data: {
      incidentId,
      type: "decision.created",
      actorId: userId,
      payload: { decisionText },
    },
  });

  return { outcome: "success" as const, decision };
}

export async function listIncidents() {
  return prisma.incident.findMany({
    orderBy: { createdAt: "desc" },
    include: { responders: true, tasks: true },
  });
}

export async function createTask(incidentId: string, title: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { outcome: "not_found" as const };

  const task = await prisma.task.create({
    data: { incidentId, title },
  });

  await prisma.timelineEvent.create({
    data: {
      incidentId,
      type: "task.created",
      actorId: null,
      payload: { title },
    },
  });

  return { outcome: "success" as const, task };
}