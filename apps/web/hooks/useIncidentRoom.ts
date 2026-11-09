// hooks/useIncidentRoom.ts
// The brain of the incident room.
// Loads the incident, connects Socket.IO, listens for events,
// and gives the UI components actions to call.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useIncidentStore } from "@/store/incident.store";
import { getSocket } from "@/lib/socket";
import {
  incidentsApi,
  tasksApi,
  ApiError,
  Incident,
  Task,
  Comment,
  Decision,
  TimelineEvent,
} from "@/lib/api";

export function useIncidentRoom(incidentId: string) {
  // Why the room could not be opened (null = no problem)
  const [accessError, setAccessError] = useState<"forbidden" | "notfound" | "error" | null>(null);

  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  // Read state from the incident store
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
  const addTimelineEvent = useIncidentStore((state) => state.addTimelineEvent);
  const addOnlineUser = useIncidentStore((state) => state.addOnlineUser);
  const removeOnlineUser = useIncidentStore((state) => state.removeOnlineUser);
  const setConnectionStatus = useIncidentStore((state) => state.setConnectionStatus);
  const reset = useIncidentStore((state) => state.reset);

  useEffect(() => {
    if (!accessToken) return;

    // ── Step 1: load the incident over REST ─────────────────────
    // If the server says 403 or 404, remember why so the page can show a message
    async function loadInitialData() {
      setAccessError(null);
      try {
        const result = await incidentsApi.get(incidentId);
        setIncident(result.incident);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) setAccessError("forbidden");
        else if (err instanceof ApiError && err.status === 404) setAccessError("notfound");
        else setAccessError("error");
      }
    }

    loadInitialData();

    // ── Step 2: get the socket and define how to join the room ──
    const socket = getSocket(accessToken);

    const joinRoom = () => {
      setConnectionStatus("live");
      // The server checks access, then sends a fresh snapshot
      socket.emit("incident:join", incidentId);
    };

    // ── Step 3: connection events ───────────────────────────────
    socket.on("connect", joinRoom); // also runs again after every reconnect
    socket.on("disconnect", () => setConnectionStatus("reconnecting"));
    socket.on("connect_error", () => setConnectionStatus("disconnected"));

    // ── Step 4: events from the server ──────────────────────────
    // Full snapshot: replaces local state with the server's truth
    socket.on("incident:snapshot", (data: Incident) => {
      setIncident(data);
      setConnectionStatus("live");
    });

    socket.on("incident:status_changed", (data: { status: Incident["status"] }) => {
      updateStatus(data.status);
    });

    socket.on("task:created", (data: { task: Task }) => addTask(data.task));

    // The server sends the full updated task (with the owner's name)
    socket.on("task:claimed", (data: { task: Task }) => updateTask(data.task.id, data.task));
    socket.on("task:completed", (data: { task: Task }) => updateTask(data.task.id, data.task));

    socket.on("comment:created", (data: { comment: Comment }) => addComment(data.comment));
    socket.on("decision:created", (data: { decision: Decision }) => addDecision(data.decision));
    socket.on("timeline:created", (data: { event: TimelineEvent }) => addTimelineEvent(data.event));

    // Someone was added: reload the incident so the responder list has their name.
    // Refetching (instead of patching local state) keeps the server authoritative.
    socket.on("responder:added", () => {
      incidentsApi
        .get(incidentId)
        .then((r) => setIncident(r.incident))
        .catch(() => { });
    });

    // ── Step 5: presence events ─────────────────────────────────
    socket.on("presence:list", (list: { userId: string; userName: string }[]) => {
      list.forEach((u) => addOnlineUser(u));
    });
    socket.on("presence:joined", (data: { userId: string; userName: string }) => addOnlineUser(data));
    socket.on("presence:left", (data: { userId: string; userName: string }) => removeOnlineUser(data.userId));

    // ── Step 6: connect, or join straight away if already connected ──
    // The socket is shared across pages. If it is already connected, the
    // "connect" event will not fire again, so we must join ourselves.
    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    // ── Cleanup when leaving the page ───────────────────────────
    return () => {
      socket.emit("incident:leave", incidentId);

      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("incident:snapshot");
      socket.off("incident:status_changed");
      socket.off("task:created");
      socket.off("task:claimed");
      socket.off("comment:created");
      socket.off("decision:created");
      socket.off("timeline:created");
      socket.off("responder:added");
      socket.off("presence:list");
      socket.off("presence:joined");
      socket.off("presence:left");
      socket.off("task:completed");

      reset();
    };
  }, [incidentId, accessToken]);

  // ── Actions the UI can call ───────────────────────────────────
  // None of these update the store directly. The server broadcasts the
  // change back and the event handlers above update the store.
  // That is what "the server is authoritative" means in practice.

const transitionStatus = useCallback(async (newStatus: string, note?: string) => {
  await incidentsApi.transition(incidentId, newStatus, note);
}, [incidentId]);

  const addResponder = useCallback(async (email: string) => {
    const result = await incidentsApi.addResponder(incidentId, email);
    return result.message;
  }, [incidentId]);

  const claimTask = useCallback(async (taskId: string) => {
    const result = await tasksApi.claim(taskId);
    // Lost the race? The response holds the server's current version of the task.
    // Replace our local copy with it, so the screen shows the truth.
    if (result.outcome === "conflict") updateTask(result.task.id, result.task);
    return result;
  }, [updateTask]);
  const completeTask = useCallback(async (taskId: string) => {
    await tasksApi.complete(taskId); // the store updates via the "task:completed" event
  }, []);

  const createTask = useCallback(async (title: string) => {
    await incidentsApi.createTask(incidentId, title);
  }, [incidentId]);

  const postComment = useCallback(async (body: string) => {
    await incidentsApi.addComment(incidentId, body);
  }, [incidentId]);

  const logDecision = useCallback(async (decisionText: string, reason: string) => {
    await incidentsApi.addDecision(incidentId, decisionText, reason);
  }, [incidentId]);

  return {
    // State
    incident,
    onlineUsers,
    connectionStatus,
    accessError,
    currentUserId: user?.id,

    // Actions
    transitionStatus,
    addResponder,
    claimTask,
    completeTask,
    createTask,
    postComment,
    logDecision,
  };
}