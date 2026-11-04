// The ONE place that answers: "can this user open this incident?"
// REST middleware and the socket handler both call this function.

import { prisma } from "../../db/prisma";

export async function canAccessIncident(
    userId: string,
    role: string,
    incidentId: string
): Promise<boolean> {
    // Admins can open any incident
    if (role === "ADMIN") return true;

    // Everyone else must be on the responders list
    const responder = await prisma.incidentResponder.findUnique({
        where: { incidentId_userId: { incidentId, userId } },
    });

    return responder !== null;
}