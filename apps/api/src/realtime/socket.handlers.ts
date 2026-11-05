// socket.handlers.ts
// Realtime entry point: authenticates every socket, then manages incident rooms.

import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../modules/auth/tokens";
import { prisma } from "../db/prisma";
import { getIncident } from "../modules/incidents/incidents.service";
import { canAccessIncident } from "../modules/incidents/access";

// Extend Socket type to carry our user identity
interface AuthenticatedSocket extends Socket {
  userId: string;
  userName: string;
  role: string;
}

export function registerSocketHandlers(io: Server) {
  // ── Connection-level auth ────────────────────────────────────
  // Runs once per connection, before the socket can do anything.
  // This is the WebSocket equivalent of requireAuth.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token provided"));

      const payload = verifyAccessToken(token);

      // Same tokenVersion check as the REST middleware
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        return next(new Error("Session no longer valid"));
      }

      // Attach identity to the socket for the handlers below
      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).userName = user.name;
      (socket as AuthenticatedSocket).role = user.role;

      // socket.data lets other server code (like fetchSockets) read this too
      socket.data.userId = user.id;
      socket.data.userName = user.name;

      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    console.log(`Socket connected: ${authedSocket.userName} (${authedSocket.userId})`);

    // ── Join an incident room ──────────────────────────────────
    socket.on("incident:join", async (incidentId: string) => {
      // Client input is never trusted
      if (typeof incidentId !== "string") return;

      // Same access rule as the REST routes
      const allowed = await canAccessIncident(
        authedSocket.userId,
        authedSocket.role,
        incidentId
      );

      if (!allowed) {
        socket.emit("error", { message: "Not authorized to join this incident room" });
        return;
      }

      const room = `incident:${incidentId}`;
      socket.join(room);
      console.log(`${authedSocket.userName} joined room ${room}`);

      // 1. Full snapshot: the client always starts from the server's truth
      const snapshot = await getIncident(incidentId);
      socket.emit("incident:snapshot", snapshot);

      // 2. Who is already in the room (so a new arrival sees existing people)
      const socketsInRoom = await io.in(room).fetchSockets();
      const here = socketsInRoom.map((s) => ({
        userId: s.data.userId,
        userName: s.data.userName,
      }));
      socket.emit("presence:list", here);

      // 3. Tell everyone else this person arrived
      socket.to(room).emit("presence:joined", {
        userId: authedSocket.userId,
        userName: authedSocket.userName,
      });
    });

    // ── Leave an incident room ─────────────────────────────────
    socket.on("incident:leave", (incidentId: string) => {
      if (typeof incidentId !== "string") return;

      const room = `incident:${incidentId}`;
      socket.leave(room);
      socket.to(room).emit("presence:left", {
        userId: authedSocket.userId,
        userName: authedSocket.userName,
      });
    });

    // ── Disconnect: clean up presence ──────────────────────────
    // "disconnecting" (not "disconnect"): at this moment the socket
    // is still in its rooms, so we know which rooms to notify.
    socket.on("disconnecting", () => {
      console.log(`Socket disconnecting: ${authedSocket.userName}`);
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