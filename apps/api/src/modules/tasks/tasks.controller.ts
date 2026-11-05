// tasks.controller.ts
import { Request, Response } from "express";
import { Task } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { claimTask, completeTask } from "./tasks.service";
import { broadcastToIncident } from "../../realtime/broadcaster";
import { recordTimelineEvent } from "../incidents/timeline.service";
import { loadActors, toActor } from "../incidents/actors";

// Attach the owner's name so the UI never has to show raw ids
async function withClaimer(task: Task) {
  const actors = await loadActors([task.claimedBy]);
  return { ...task, claimer: toActor(actors, task.claimedBy) };
}

export async function claimTaskHandler(req: Request, res: Response) {
  const taskId = String(req.params.taskId);
  const userId = req.user!.id;

  const winCount = await claimTask(taskId, userId); // 1 = won the race, 0 = lost

  // Read the task AFTER the attempt. Win or lose, this is the server's truth.
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const taskWithClaimer = await withClaimer(task);

  if (winCount === 1) {
    await recordTimelineEvent(task.incidentId, "task.claimed", userId, {
      taskId,
      title: task.title,
    });
    broadcastToIncident(task.incidentId, "task:claimed", { task: taskWithClaimer });
    return res.status(200).json({ outcome: "claimed", task: taskWithClaimer });
  }

  // Lost the race: send back who won so the UI can explain it
  return res.status(409).json({
    outcome: "conflict",
    message: "This task was already claimed.",
    task: taskWithClaimer,
  });
}

export async function completeTaskHandler(req: Request, res: Response) {
  const taskId = String(req.params.taskId);
  const userId = req.user!.id;

  const count = await completeTask(taskId, userId);

  if (count === 0) {
    return res.status(409).json({
      error: "Only the person who claimed this task can complete it",
    });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  const taskWithClaimer = await withClaimer(task!);

  await recordTimelineEvent(task!.incidentId, "task.completed", userId, {
    taskId,
    title: task!.title,
  });
  broadcastToIncident(task!.incidentId, "task:completed", { task: taskWithClaimer });

  return res.status(200).json({ task: taskWithClaimer });
}