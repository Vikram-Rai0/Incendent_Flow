// hooks/useIncidentRoom.ts
// The brain of the incident room
// Connects Socket.IO, handles all realtime events,
// and provides actions for the UI components

"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useIncidentStore } from "@/store/incident.store";
import { getSocket } from "@/lib/socket";
import { incidentsApi, tasksApi, Incident, Task, Comment, Decision } from "@/lib/api";

export function useIncidentRoom(incidentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  // Read everything from the incident store
  const incident = useIncidentStore((state) => state.incident);
  const onlineUsers = useIncidentStore((state) => state.onlineUsers);
  const connectionStatus = useIncidentStore((state) => state.connectionStatus);

  // Store actions
  const setIncident = useIncidentStore((state) => state.setIncident);
  const updateStatus = useIncidentStore((state) => state.updateStatus);
  const addTask = useIncidentStore((state) => state.addTask);
  const updateTask = useIncidentStore((state) => state.updateTask);
  const addComment = useIncidentStore((state) => state.addComment);
  const addDecision = useIncidentStore((state) => state.addDecision);
  const addOnlineUser = useIncidentStore((state) => state.addOnlineUser);
  const removeOnlineUser = useIncidentStore((state) => state.removeOnlineUser);
  const setConnectionStatus = useIncidentStore((state) => state.setConnectionStatus);
  const reset = useIncidentStore((state) => state.reset);

  useEffect(() => {
    if (!accessToken) return;

    // ── Step 1: Load initial data via REST ──────────────────────
    // This gives us data immediately, before Socket.IO even connects
    async function loadInitialData() {
      try {
        const result = await incidentsApi.get(incidentId);
        setIncident(result.incident);

        // Also join as a responder if not already
        await incidentsApi.join(incidentId).catch(() => {
          // Ignore error — already a responder is fine
        });
      } catch (err) {
        console.error("Failed to load incident:", err);
      }
    }

    loadInitialData();

    // ── Step 2: Connect Socket.IO ────────────────────────────────
    const socket = getSocket(accessToken);
    socket.connect();

    // ── Step 3: Connection status events ────────────────────────
    socket.on("connect", () => {
      setConnectionStatus("live");
      // Join the incident room on the server
      // Server will send a fresh snapshot when we join
      socket.emit("incident:join", incidentId);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("reconnecting");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    // ── Step 4: Handle incoming events ──────────────────────────
    // Each event updates only the relevant part of the store
    // React re-renders only the components that use that slice

    // Full snapshot — received when joining or reconnecting
    // Replaces all local state with authoritative server state
    socket.on("incident:snapshot", (data: Incident) => {
      setIncident(data);
      setConnectionStatus("live");
    });

    // Status changed by another responder
    // REPLACE with:
socket.on("incident:status_changed", (data: {
  status: Incident["status"];
}) => {
  updateStatus(data.status);
});

    // New task created
    socket.on("task:created", (data: { task: Task }) => {
      addTask(data.task);
    });

    // Task claimed by someone
    socket.on("task:claimed", (data: {
      taskId: string;
      claimedBy: string;
      claimedAt: string;
    }) => {
      updateTask(data.taskId, {
        status: "CLAIMED",
        claimedBy: data.claimedBy,
        claimedAt: data.claimedAt,
      });
    });

    // New comment posted
    socket.on("comment:created", (data: { comment: Comment }) => {
      addComment(data.comment);
    });

    // New decision logged
    socket.on("decision:created", (data: { decision: Decision }) => {
      addDecision(data.decision);
    });

    // ── Step 5: Presence events ──────────────────────────────────
    socket.on("presence:joined", (data: { userId: string; userName: string }) => {
      addOnlineUser(data);
    });

    socket.on("presence:left", (data: { userId: string; userName: string }) => {
      removeOnlineUser(data.userId);
    });

    // ── Step 6: Cleanup when leaving the page ───────────────────
    return () => {
      // Tell the server we're leaving this room
      socket.emit("incident:leave", incidentId);

      // Remove all event listeners
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("incident:snapshot");
      socket.off("incident:status_changed");
      socket.off("task:created");
      socket.off("task:claimed");
      socket.off("comment:created");
      socket.off("decision:created");
      socket.off("presence:joined");
      socket.off("presence:left");

      // Reset the store
      reset();
    };
  }, [incidentId, accessToken]);

  // ── Actions ────────────────────────────────────────────────────
  // These are functions the UI components call when the user does something

  const transitionStatus = useCallback(async (newStatus: string) => {
    await incidentsApi.transition(incidentId, newStatus);
    // No need to update store here — the broadcast from the server
    // will trigger "incident:status_changed" which updates the store
    // This is the "server is authoritative" principle in action
  }, [incidentId]);

  const claimTask = useCallback(async (taskId: string) => {
    // Returns { outcome: "claimed" | "conflict", ... }
    const result = await tasksApi.claim(taskId);
    return result;
    // Store update happens via the "task:claimed" Socket.IO event
    // NOT here — we never update state optimistically for claims
  }, []);

  const createTask = useCallback(async (title: string) => {
    await incidentsApi.createTask(incidentId, title);
    // Store update via "task:created" event
  }, [incidentId]);

  const postComment = useCallback(async (body: string) => {
    await incidentsApi.addComment(incidentId, body);
    // Store update via "comment:created" event
  }, [incidentId]);

  const logDecision = useCallback(async (decisionText: string, reason: string) => {
    await incidentsApi.addDecision(incidentId, decisionText, reason);
    // Store update via "decision:created" event
  }, [incidentId]);

  return {
    // State
    incident,
    onlineUsers,
    connectionStatus,
    currentUserId: user?.id,

    // Actions
    transitionStatus,
    claimTask,
    createTask,
    postComment,
    logDecision,
  };
}