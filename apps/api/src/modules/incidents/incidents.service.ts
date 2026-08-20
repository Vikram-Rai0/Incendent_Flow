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