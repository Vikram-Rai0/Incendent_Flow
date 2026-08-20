import { IncidentStatus } from "@prisma/client";

// Adjacency map - every valid transition explicitly listed
// If it's not in this map, it's not allowed, period.
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["INVESTIGATING"],
  INVESTIGATING: ["IDENTIFIED"],
  IDENTIFIED: ["MITIGATING", "INVESTIGATING"], // can loop back
  MITIGATING: ["RESOLVED", "INVESTIGATING"],   // can loop back
  RESOLVED: ["CLOSED"],
  CLOSED: [],                                   // terminal state
};

export function isValidTransition(
  from: IncidentStatus,
  to: IncidentStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(from: IncidentStatus): IncidentStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}