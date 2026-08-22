import { Server } from "socket.io";

let _io: Server;

export function initBroadcaster(io: Server) {
  _io = io;
}

export function broadcastToIncident(incidentId: string, event: string, data: unknown) {
  if (!_io) return;
  _io.to(`incident:${incidentId}`).emit(event, data);
}