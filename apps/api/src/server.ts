import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import { requireAuth, } from "./middleware/auth.middleware";
import { registerHandler, loginHandler, refreshHandler, logoutHandler } from "./modules/auth/auth.controller";
import { claimTaskHandler,completeTaskHandler } from "./modules/tasks/tasks.controller";
import { requireIncidentAccess,requireTaskAccess } from "./middleware/access.middleware";
import {
  createIncidentHandler,
  getIncidentHandler,
  transitionIncidentHandler,
  addCommentHandler,
  addDecisionHandler,
  listIncidentsHandler,
  createTaskHandler,
  addResponderHandler
} from "./modules/incidents/incidents.controller";
import { registerSocketHandlers } from "./realtime/socket.handlers";
import { initBroadcaster } from "./realtime/broadcaster";
import { getSummaryHandler } from "./modules/incidents/incidents.controller";


const clientOrigin = process.env.CLIENT_ORIGIN;

console.log("CLIENT_ORIGIN:", clientOrigin);


const app = express();

// HTTP server wraps Express — this is what Socket.IO attaches to
// Same port serves both REST (HTTP) and WebSocket (WS upgrade)
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
    credentials: true,
  },
});

// Express CORS must run before your routes
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// REST routes
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));
app.post("/auth/register", registerHandler);
app.post("/auth/login", loginHandler);
app.post("/auth/refresh", refreshHandler);
app.post("/auth/logout", requireAuth, logoutHandler);


app.get("/incidents", requireAuth, listIncidentsHandler);
app.post("/incidents", requireAuth, createIncidentHandler);
app.get("/incidents/:incidentId", requireAuth, requireIncidentAccess, getIncidentHandler);
app.patch("/incidents/:incidentId/status", requireAuth, requireIncidentAccess, transitionIncidentHandler);
app.post("/incidents/:incidentId/responders", requireAuth, requireIncidentAccess, addResponderHandler);
app.post("/incidents/:incidentId/comments", requireAuth, requireIncidentAccess, addCommentHandler);
app.post("/incidents/:incidentId/decisions", requireAuth, requireIncidentAccess, addDecisionHandler);
app.post("/incidents/:incidentId/tasks", requireAuth, requireIncidentAccess, createTaskHandler);
app.post("/tasks/:taskId/claim", requireAuth, requireTaskAccess, claimTaskHandler);
app.post("/tasks/:taskId/complete", requireAuth, requireTaskAccess, completeTaskHandler);
app.get("/incidents/:incidentId/summary", requireAuth, requireIncidentAccess, getSummaryHandler);

// Realtime layer
// initBroadcaster stores the io instance so service functions can
// broadcast without importing io directly (avoids circular deps)
initBroadcaster(io);
registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;

// httpServer.listen, not app.listen — critical difference
// app.listen creates its own internal HTTP server which Socket.IO
// would NOT be attached to, breaking WebSocket entirely
httpServer.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error({
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  res.status(500).json({ error: "Internal server error" });
});