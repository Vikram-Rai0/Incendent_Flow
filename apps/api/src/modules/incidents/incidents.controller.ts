import { Request, Response } from "express";
import { IncidentStatus, Severity } from "@prisma/client";
import {
  createIncident,
  getIncident,
  transitionIncident,
  addComment,
  addDecision,
  listIncidents,
  createTask,
  addResponder
} from "./incidents.service";

import { getIncidentSummary } from "./summary.service";


export async function getSummaryHandler(req: Request, res: Response) {
  const summary = await getIncidentSummary(String(req.params.incidentId));
  if (!summary) return res.status(404).json({ error: "Incident not found" });
  return res.status(200).json({ summary });
}

export async function createIncidentHandler(req: Request, res: Response) {
  const { title, description, severity } = req.body;

  if (!title || !description || !severity) {
    return res.status(400).json({ error: "title, description and severity are required" });
  }

  const incident = await createIncident(
    title,
    description,
    severity as Severity,
    req.user!.id
  );

  return res.status(201).json({ incident });
}

export async function getIncidentHandler(req: Request, res: Response) {
  const incident = await getIncident(String(req.params.incidentId));

  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }

  return res.status(200).json({ incident });
}

export async function transitionIncidentHandler(req: Request, res: Response) {
  const incidentId = String(req.params.incidentId);
  const { status, note } = req.body;

  if (!status) return res.status(400).json({ error: "status is required" });

  if (!Object.values(IncidentStatus).includes(status)) {
    return res.status(400).json({ error: "Invalid status value", valid: Object.values(IncidentStatus) });
  }

  if (note !== undefined && (typeof note !== "string" || note.length > 2000)) {
    return res.status(400).json({ error: "note must be text, up to 2000 characters" });
  }

  const result = await transitionIncident(incidentId, status as IncidentStatus, req.user!.id, note);

  switch (result.outcome) {
    case "not_found":
      return res.status(404).json({ error: "Incident not found" });
    case "invalid_transition":
      return res.status(409).json({
        error: `Cannot transition from ${result.from} to ${result.to}`,
        allowedTransitions: result.allowed,
      });
    case "note_required":
      return res.status(400).json({ error: "Describe how the incident was resolved (at least 10 characters)" });
    case "conflict":
      return res.status(409).json({ error: "The status was just changed by someone else. The page has been updated." });
    default:
      return res.status(200).json({ incident: result.incident });
  }
}

export async function listIncidentsHandler(req: Request, res: Response) {
  const incidents = await listIncidents(req.user!.id, req.user!.role);
  return res.status(200).json({ incidents });
}

export async function addResponderHandler(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const result = await addResponder(String(req.params.incidentId), req.user!.id, email);

  if (result.outcome === "user_not_found") {
    return res.status(404).json({ error: "No user with that email" });
  }
  if (result.outcome === "already_member") {
    return res.status(200).json({ message: "Already a responder" });
  }
  return res.status(201).json({ message: "Responder added" });
}

export async function addCommentHandler(req: Request, res: Response) {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "body is required" });
  const result = await addComment(String(req.params.incidentId), req.user!.id, body);
  if (result.outcome === "not_found") {
    return res.status(404).json({ error: "Incident not found" });
  }
  return res.status(201).json({ comment: result.comment });
}

export async function addDecisionHandler(req: Request, res: Response) {
  const { decisionText, reason } = req.body;
  if (!decisionText || !reason) {
    return res.status(400).json({ error: "decisionText and reason are required" });
  }
  const result = await addDecision(
    String(req.params.incidentId),
    req.user!.id,
    decisionText,
    reason
  );
  if (result.outcome === "not_found") {
    return res.status(404).json({ error: "Incident not found" });
  }
  return res.status(201).json({ decision: result.decision });
}



export async function createTaskHandler(req: Request, res: Response) {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const result = await createTask(String(req.params.incidentId), title, req.user!.id);
  if (result.outcome === "not_found") {
    return res.status(404).json({ error: "Incident not found" });
  }
  return res.status(201).json({ task: result.task });
}