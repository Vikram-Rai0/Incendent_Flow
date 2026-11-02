// lib/statemachine.ts
// Client-side copy of the incident state machine
// Used to derive allowedTransitions from the current status
// without relying on the server to send them

export type IncidentStatus =
  | "DETECTED"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "IDENTIFIED"
  | "MITIGATING"
  | "RESOLVED"
  | "CLOSED";

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["INVESTIGATING"],
  INVESTIGATING: ["IDENTIFIED"],
  IDENTIFIED: ["MITIGATING", "INVESTIGATING"],
  MITIGATING: ["RESOLVED", "INVESTIGATING"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export function getAllowedTransitions(status: IncidentStatus): IncidentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}