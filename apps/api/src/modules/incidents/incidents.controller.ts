import { Request, Response } from "express";
import { IncidentStatus, Severity } from "@prisma/client";
import {
    createIncident,
    getIncident,
    transitionIncident,
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