// lib/socket.ts
// Creates ONE Socket.IO client instance for the whole app
// Singleton pattern — we never want two connections open at once

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  // If a socket already exists and is connected, reuse it
  if (socket && socket.connected) {
    return socket;
  }

  // If there's a disconnected socket, clean it up first
  if (socket) {
    socket.disconnect();
  }

  // Create a new socket connection
  // Pass the JWT token in the handshake — this is how our
  // Socket.IO auth middleware on the server verifies identity
  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token: accessToken },
    // Don't connect immediately — we'll connect manually
    autoConnect: false,
    // Reconnection settings
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}