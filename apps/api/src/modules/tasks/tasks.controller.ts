import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { claimTask } from "./tasks.service";

export async function claimTaskHandler(req: Request, res: Response) {
    const { taskId } = req.params;
    const taskIdStr = String(taskId); // guarantees string, never string[]
    const userId = req.user!.id;

    const winCount = await claimTask(taskIdStr, userId);

    if (winCount === 1) {
        const task = await prisma.task.findUnique({ where: { id: taskIdStr } });
        return res.status(200).json({ outcome: "claimed", task });
    }

    const currentTask = await prisma.task.findUnique({ where: { id: taskIdStr } });

    if (!currentTask) {
        return res.status(404).json({ error: "Task not found" });
    }

    return res.status(409).json({
        outcome: "conflict",
        message: "This task was already claimed.",
        claimedBy: currentTask.claimedBy,
        claimedAt: currentTask.claimedAt,
    })
};