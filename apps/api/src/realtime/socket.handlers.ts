import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../modules/auth/tokens";
import { prisma } from "../db/prisma";
import { getIncident } from "../modules/incidents/incidents.service";

// Extend Socket type to carry our user identity
interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
  role: string;
}

export function registerSocketHandlers(io: Server) {

  // Auth middleware - runs before any connection is established
  // This is the WS equivalent of requireAuth - reject before joining any room
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token provided"));

      const payload = verifyAccessToken(token);

      // Verify tokenVersion - same check as REST middleware
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        return next(new Error("Session no longer valid"));
      }

      // Attach identity to socket - available in all handlers below
      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).userName = user.name;
      (socket as AuthenticatedSocket).role = user.role;

      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    console.log(`Socket connected: ${authedSocket.userName} (${authedSocket.userId})`);

    // JOIN INCIDENT ROOM
    // Client sends this after connecting to subscribe to a specific incident
    socket.on("incident:join", async (incidentId: string) => {
      // Verify this user is actually a responder on this incident
      const responder = await prisma.incidentResponder.findUnique({
        where: {
          incidentId_userId: {
            incidentId,
            userId: authedSocket.userId,
          },
        },
      });

      if (!responder && authedSocket.role !== "ADMIN") {
        socket.emit("error", { message: "Not authorized to join this incident room" });
        return;
      }

      socket.join(`incident:${incidentId}`);
      console.log(`${authedSocket.userName} joined room incident:${incidentId}`);

      // Send full snapshot to the joining client
      // This is the reconnection safety net - never trust buffered events alone
      const snapshot = await getIncident(incidentId);
      socket.emit("incident:snapshot", snapshot);

      // Notify others in the room this person is now present
      socket.to(`incident:${incidentId}`).emit("presence:joined", {
        userId: authedSocket.userId,
        userName: authedSocket.userName,
      });
    });

    // LEAVE INCIDENT ROOM
    socket.on("incident:leave", (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
      socket.to(`incident:${incidentId}`).emit("presence:left", {
        userId: authedSocket.userId,
        userName: authedSocket.userName,
      });
    });

    // DISCONNECT - clean up presence from all rooms
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${authedSocket.userName}`);
      // Broadcast to all rooms this socket was in
      for (const room of socket.rooms) {
        if (room.startsWith("incident:")) {
          socket.to(room).emit("presence:left", {
            userId: authedSocket.userId,
            userName: authedSocket.userName,
          });
        }
      }
    });
  });
}