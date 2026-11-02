// store/incident.store.ts
// Holds the complete state of one incident room
// Updated by Socket.IO events in real time

import { create } from "zustand";
import { Incident, Task, Comment, Decision, TimelineEvent } from "@/lib/api";

interface PresenceUser {
  userId: string;
  userName: string;
}

interface IncidentState {
  // The incident data
  incident: Incident | null;

  // Who is currently online in this room
  onlineUsers: PresenceUser[];

  // Connection status — shown in the UI
  connectionStatus: "connecting" | "live" | "reconnecting" | "disconnected";

  // Actions — called by the useIncidentRoom hook
  setIncident: (incident: Incident) => void;
 updateStatus: (status: Incident["status"]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addComment: (comment: Comment) => void;
  addDecision: (decision: Decision) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  addOnlineUser: (user: PresenceUser) => void;
  removeOnlineUser: (userId: string) => void;
  setConnectionStatus: (status: IncidentState["connectionStatus"]) => void;
  reset: () => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  // Initial empty state
  incident: null,
  onlineUsers: [],
  connectionStatus: "connecting",

  // Replace entire incident (used on initial load and reconnect)
  setIncident: (incident) => set({ incident }),

  // Update just the status and allowed transitions
  // Called when another user changes the incident status
 updateStatus: (status) =>
  set((state) => ({
    incident: state.incident
      ? { ...state.incident, status }
      : null,
  })),
  // Add a new task to the list
  addTask: (task) =>
    set((state) => ({
      incident: state.incident
        ? { ...state.incident, tasks: [...state.incident.tasks, task] }
        : null,
    })),

  // Update a specific task (e.g. when it gets claimed)
  updateTask: (taskId, updates) =>
    set((state) => ({
      incident: state.incident
        ? {
          ...state.incident,
          tasks: state.incident.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        }
        : null,
    })),

  // Add a new comment to the list
  addComment: (comment) =>
    set((state) => ({
      incident: state.incident
        ? { ...state.incident, comments: [...state.incident.comments, comment] }
        : null,
    })),

  // Add a new decision to the log
  addDecision: (decision) =>
    set((state) => ({
      incident: state.incident
        ? { ...state.incident, decisions: [...state.incident.decisions, decision] }
        : null,
    })),

  // Add a new timeline event
  addTimelineEvent: (event) =>
    set((state) => ({
      incident: state.incident
        ? {
          ...state.incident,
          timelineEvents: [...state.incident.timelineEvents, event],
        }
        : null,
    })),

  // Someone came online
  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.some((u) => u.userId === user.userId)
        ? state.onlineUsers // already in list, don't duplicate
        : [...state.onlineUsers, user],
    })),

  // Someone went offline
  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  // Clear everything when leaving the incident room
  reset: () =>
    set({
      incident: null,
      onlineUsers: [],
      connectionStatus: "connecting",
    }),
}));