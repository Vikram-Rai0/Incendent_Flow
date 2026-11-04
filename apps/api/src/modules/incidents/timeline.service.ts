import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { broadcastToIncident } from "../../realtime/broadcaster";
import { withActor } from "./actors";

export async function recordTimelineEvent(
  incidentId: string,
  type: string,
  actorId: string | null,
  payload: Prisma.InputJsonObject = {}
) {
  // 1. Save to the database (permanent record)
  const event = await prisma.timelineEvent.create({
    data: { incidentId, type, actorId, payload },
  });

  // 2. Attach the actor, then broadcast. Same shape as the snapshot.
  const eventWithActor = await withActor(event);
  broadcastToIncident(incidentId, "timeline:created", { event: eventWithActor });

  return eventWithActor;
}