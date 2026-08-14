import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { claimTask } from "./tasks.service";

export async function claimTaskHandler(req: Request, res: Response) {
    const { taskId } = req.params;
    // TEMPORARY stub until auth is wired in - replace with req.user.id
    const userId = req.header("x-debug-user-id");

    if (!userId) {
        return res.status(400).json({ error: "x-debug-user-id header required (temp, until auth)" });
    }

    const winCount = await claimTask(taskId, userId);

    if (winCount === 1) {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        return res.status(200).json({ outcome: "claimed", task });
    }

    // Lost the race - fetch current state purely to report who won, not to decide anything
    const currentTask = await prisma.task.findUnique({ where: { id: taskId } });

    if (!currentTask) {
        return res.status(404).json({ error: "Task not found" });
    }

    return res.status(409).json({
        outcome: "conflict",
        message: `This task was already claimed.`,
        claimedBy: currentTask.claimedBy,
        claimedAt: currentTask.claimedAt,
    });
}