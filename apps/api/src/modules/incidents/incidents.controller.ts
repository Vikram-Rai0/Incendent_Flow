import { Request, Response } from "express";
import { IncidentStatus, Severity } from "@prisma/client";
import {
  createIncident,
  getIncident,
  transitionIncident,
  joinIncident,
  addComment,
  addDecision,
  listIncidents,
  createTask,
} from "./incidents.service";

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
    const { incidentId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "status is required" });
    }

    // Validate the status value is a real IncidentStatus enum value
    if (!Object.values(IncidentStatus).includes(status)) {
        return res.status(400).json({
            error: "Invalid status value",
            valid: Object.values(IncidentStatus),
        });
    }

    const result = await transitionIncident(
        String(incidentId),
        status as IncidentStatus,
        req.user!.id
    );

    if (result.outcome === "not_found") {
        return res.status(404).json({ error: "Incident not found" });
    }

    if (result.outcome === "invalid_transition") {
        return res.status(409).json({
            error: `Cannot transition from ${result.from} to ${result.to}`,
            allowedTransitions: result.allowed,
        });
    }

    return res.status(200).json({ incident: result.incident });
}



export async function joinIncidentHandler(req: Request, res: Response) {
  const result = await joinIncident(String(req.params.incidentId), req.user!.id);
  if (result.outcome === "not_found") return res.status(404).json({ error: "Incident not found" });
  return res.status(200).json({ message: "Joined incident" });
}

export async function addCommentHandler(req: Request, res: Response) {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "body is required" });
  const result = await addComment(String(req.params.incidentId), req.user!.id, body);
  if (result.outcome === "not_found") return res.status(404).json({ error: "Incident not found" });
  return res.status(201).json({ comment: result.comment });
}

export async function addDecisionHandler(req: Request, res: Response) {
  const { decisionText, reason } = req.body;
  if (!decisionText || !reason) return res.status(400).json({ error: "decisionText and reason are required" });
  const result = await addDecision(String(req.params.incidentId), req.user!.id, decisionText, reason);
  if (result.outcome === "not_found") return res.status(404).json({ error: "Incident not found" });
  return res.status(201).json({ decision: result.decision });
}

export async function listIncidentsHandler(_req: Request, res: Response) {
  const incidents = await listIncidents();
  return res.status(200).json({ incidents });
}

export async function createTaskHandler(req: Request, res: Response) {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const result = await createTask(String(req.params.incidentId), title);
  if (result.outcome === "not_found") return res.status(404).json({ error: "Incident not found" });
  return res.status(201).json({ task: result.task });
}