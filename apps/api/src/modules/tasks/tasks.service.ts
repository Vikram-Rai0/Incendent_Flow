import { prisma } from "../../db/prisma";

export type ClaimResult =
  | { outcome: "claimed"; task: NonNullable<Awaited<ReturnType<typeof claimTask>>> }
  | { outcome: "conflict"; claimedBy: string; claimedAt: Date | null };

export async function claimTask(taskId: string, userId: string) {
  // The atomic conditional update: the WHERE clause is the entire
  // concurrency control mechanism. Two simultaneous calls to this
  // function with the same taskId will race at the database level,
  // and Postgres guarantees only one UPDATE actually matches the
  // WHERE clause and returns a row - the other returns zero rows.
  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      status: "UNCLAIMED",
    },
    data: {
      status: "CLAIMED",
      claimedBy: userId,
      claimedAt: new Date(),
      version: { increment: 1 },
    },
  });

  return result.count; // 1 = you won the race, 0 = you lost it
}