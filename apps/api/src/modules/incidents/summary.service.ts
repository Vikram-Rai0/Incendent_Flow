// summary.service.ts
// Builds the post-incident record. Nothing here is stored.
// It is all derived from data we already keep, so it can never go stale.

import { getIncident } from "./incidents.service";

type StatusEvent = { type: string; createdAt: Date; payload: unknown };

// Pure function: the same input always gives the same output, and it never
// touches the database. That makes it easy to unit test.
// Time spent in each ACTIVE status. A status can repeat (we may go back to
// INVESTIGATING), so the time is added up per status.
export function computePhases(createdAt: Date, events: StatusEvent[], endAt: Date) {
  // 1. A list of "entered status X at time T", starting when the incident was created
  const entries: { status: string; at: Date }[] = [{ status: "DETECTED", at: createdAt }];
  for (const e of events) {
    if (e.type !== "incident.status_changed") continue;
    const to = (e.payload as { to?: string } | null)?.to;
    if (to) entries.push({ status: to, at: e.createdAt });
  }

  // 2. Each entry lasts until the next one (the last lasts until endAt)
  const totals = new Map<string, number>();
  entries.forEach((entry, i) => {
    if (entry.status === "RESOLVED" || entry.status === "CLOSED") return; // not response time
    const next = entries[i + 1]?.at ?? endAt;
    const ms = Math.max(0, next.getTime() - entry.at.getTime());
    totals.set(entry.status, (totals.get(entry.status) ?? 0) + ms);
  });

  return [...totals].map(([status, durationMs]) => ({ status, durationMs }));
}

export async function getIncidentSummary(incidentId: string) {
  const incident = await getIncident(incidentId);
  if (!incident) return null;

  // A resolved incident stops the clock at resolvedAt. An active one uses "now".
  const endAt = incident.resolvedAt ?? new Date();

  // Time to acknowledge: how long until someone first acknowledged it
  const ackEvent = incident.timelineEvents.find(
    (e) =>
      e.type === "incident.status_changed" &&
      (e.payload as { to?: string } | null)?.to === "ACKNOWLEDGED"
  );

  // Who did what, counted from the real data
  const people = incident.responders.map((r) => ({
    userId: r.userId,
    name: r.user.name,
    isCommander: r.userId === incident.commanderId,
    tasksCompleted: incident.tasks.filter(
      (t) => t.status === "COMPLETED" && t.claimedBy === r.userId
    ).length,
    comments: incident.comments.filter((c) => c.userId === r.userId).length,
    decisions: incident.decisions.filter((d) => d.madeBy === r.userId).length,
  }));

  return {
    incidentId: incident.id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    inProgress: !incident.resolvedAt,
    startedAt: incident.createdAt,
    resolvedAt: incident.resolvedAt,
    durationMs: endAt.getTime() - incident.createdAt.getTime(),
    timeToAcknowledgeMs: ackEvent
      ? ackEvent.createdAt.getTime() - incident.createdAt.getTime()
      : null,
    commander: people.find((p) => p.isCommander)?.name ?? null,
    resolution: incident.resolutionNote,
    phases: computePhases(incident.createdAt, incident.timelineEvents, endAt),
    counts: {
      tasks: incident.tasks.length,
      tasksCompleted: incident.tasks.filter((t) => t.status === "COMPLETED").length,
      decisions: incident.decisions.length,
      comments: incident.comments.length,
    },
    people,
    decisions: incident.decisions.map((d) => ({
      decisionText: d.decisionText,
      reason: d.reason,
      madeBy: d.author?.name ?? null,
      createdAt: d.createdAt,
    })),
  };
}