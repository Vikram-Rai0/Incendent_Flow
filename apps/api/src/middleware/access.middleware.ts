// access.middleware.ts
// Runs AFTER requireAuth (so req.user exists) and BEFORE the route handler.

import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { canAccessIncident } from "../modules/incidents/access";

// For routes like /incidents/:incidentId/...
export async function requireIncidentAccess(req: Request, res: Response, next: NextFunction) {
  const incidentId = String(req.params.incidentId);
  const allowed = await canAccessIncident(req.user!.id, req.user!.role, incidentId);

  if (!allowed) {
    return res.status(403).json({ error: "You do not have access to this incident" });
  }
  next();
}

// For routes like /tasks/:taskId/claim
// A task has no incidentId in the URL, so we look it up first
export async function requireTaskAccess(req: Request, res: Response, next: NextFunction) {
  const task = await prisma.task.findUnique({
    where: { id: String(req.params.taskId) },
  });

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const allowed = await canAccessIncident(req.user!.id, req.user!.role, task.incidentId);

  if (!allowed) {
    return res.status(403).json({ error: "You do not have access to this incident" });
  }
  next();
}