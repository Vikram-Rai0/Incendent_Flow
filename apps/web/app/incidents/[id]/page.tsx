// app/incidents/[id]/page.tsx
// Incident room - live view of one incident
// Route: /incidents/[id]

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Wifi } from "lucide-react";
import { useIncidentRoom } from "@/hooks/useIncidentRoom";
import { TaskList } from "@/components/incidents/TaskList";
import { CommentThread } from "@/components/incidents/CommentThread";
import { DecisionLog } from "@/components/incidents/DecisionLog";
import { Timeline } from "@/components/incidents/Timeline";
import { ResponderPanel } from "@/components/incidents/ResponderPanel";
import { StatusPill, StatusActions } from "@/components/incidents/StatusBadge";
import { PostIncidentSummary } from "@/components/incidents/PostIncidentSummary";

const DOT = "\u00B7"; // middle dot
const ELLIPSIS = "\u2026";

// All colors come from the theme tokens in globals.css (light + dark).
const SEVERITY_STYLES: Record<string, { chip: string; dot: string }> = {
  SEV1: { chip: "border-sev1/30 bg-sev1/10 text-sev1", dot: "bg-sev1" },
  SEV2: { chip: "border-sev2/30 bg-sev2/10 text-sev2", dot: "bg-sev2" },
  SEV3: { chip: "border-sev3/30 bg-sev3/10 text-sev3", dot: "bg-sev3" },
  SEV4: { chip: "border-border bg-muted text-muted-foreground", dot: "bg-sev4" },
};

const TABS = ["timeline", "decisions", "summary"] as const;
type Tab = (typeof TABS)[number];

export default function IncidentRoomPage() {
  const params = useParams();
  const incidentId = params.id as string;
  const [tab, setTab] = useState<Tab>("timeline");

  const {
    incident,
    onlineUsers,
    connectionStatus,
    accessError,
    currentUserId,
    transitionStatus,
    addResponder,
    claimTask,
    createTask,
    postComment,
    completeTask,
    logDecision,
  } = useIncidentRoom(incidentId);

  if (accessError) {
    const messages = {
      forbidden: {
        title: "You don't have access to this incident",
        body: "Ask a responder on this incident to add you using your email address.",
      },
      notfound: {
        title: "Incident not found",
        body: "It may have been removed, or the link is wrong.",
      },
      error: {
        title: "Something went wrong",
        body: "We couldn't load this incident. Try refreshing the page.",
      },
    }[accessError];

    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="mb-1.5 text-base font-semibold text-foreground">{messages.title}</h1>
        <p className="mb-5 text-[13px] text-muted-foreground">{messages.body}</p>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-[13px] text-primary hover:opacity-80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to incidents
        </Link>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[13px] text-muted-foreground">Loading incident room...</p>
      </div>
    );
  }

  const sev = SEVERITY_STYLES[incident.severity] ?? SEVERITY_STYLES.SEV4;

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-6 border-b border-border pb-5">
        <Link
          href="/incidents"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Incidents
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${sev.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                {incident.severity.replace("SEV", "SEV-")}
              </span>
              <StatusPill status={incident.status} />
              <span className="text-[11px] text-muted-foreground">
                {DOT} INC-{incidentId.slice(0, 6)}
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
              {incident.title}
            </h1>
            {incident.description && (
              <p className="mt-1.5 max-w-3xl text-[13px] text-muted-foreground">
                {incident.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <ConnectionStatus status={connectionStatus} />
            <StatusActions status={incident.status} onTransition={transitionStatus} />
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)_minmax(280px,340px)]">
        {/* Left: responders */}
        <ResponderPanel
          responders={incident.responders}
          tasks={incident.tasks}
          onlineUsers={onlineUsers}
          currentUserId={currentUserId}
          onAddResponder={addResponder}
        />

        {/* Middle: investigation + tabs */}
        <div className="min-w-0 space-y-5">
          <TaskList
            tasks={incident.tasks}
            currentUserId={currentUserId}
            onClaimTask={claimTask}
            onCompleteTask={completeTask}
            onCreateTask={createTask}
          />

          <div>
            {/* Sliding tab toggle */}
            <div
              role="tablist"
              className="relative mb-3 inline-grid grid-cols-3 rounded-lg border border-border bg-muted p-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-y-0.5 left-0.5 rounded-md border border-border bg-card soft-shadow transition-transform duration-200 ease-out"
                style={{
                  width: "calc((100% - 4px) / 3)",
                  transform: `translateX(${TABS.indexOf(tab) * 100}%)`,
                }}
              />
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`relative z-10 rounded-md px-4 py-1 text-[13px] font-medium capitalize transition-colors ${
                    tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "timeline" && <Timeline events={incident.timelineEvents} />}
            {tab === "decisions" && (
              <DecisionLog decisions={incident.decisions} onLogDecision={logDecision} />
            )}
            {tab === "summary" && (
              <PostIncidentSummary incidentId={incidentId} status={incident.status} />
            )}
          </div>
        </div>

        {/* Right: discussion */}
        <CommentThread
          comments={incident.comments}
          currentUserId={currentUserId}
          onPostComment={postComment}
        />
      </div>
    </div>
  );
}

function ConnectionStatus({ status }: { status: string }) {
  const config =
    {
      live: { text: "Live", color: "text-ok border-ok/30 bg-ok/10", icon: "" },
      reconnecting: {
        text: `Reconnecting${ELLIPSIS}`,
        color: "text-sev3 border-sev3/30 bg-sev3/10",
        icon: "animate-pulse",
      },
      disconnected: {
        text: "Disconnected",
        color: "text-sev1 border-sev1/30 bg-sev1/10",
        icon: "",
      },
      connecting: {
        text: `Connecting${ELLIPSIS}`,
        color: "text-muted-foreground border-border bg-muted",
        icon: "animate-pulse",
      },
    }[status] ?? {
      text: status,
      color: "text-muted-foreground border-border bg-muted",
      icon: "",
    };

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${config.color}`}
    >
      <Wifi className={`h-3.5 w-3.5 ${config.icon}`} />
      {config.text}
    </div>
  );
}