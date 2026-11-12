// Answers: what happened, who did what, when, what was decided, how was it resolved.
// The server builds all of it. This component only displays it.

"use client";

import { useEffect, useState } from "react";
import { incidentsApi, IncidentSummary } from "@/lib/api";
import { formatDuration } from "@/lib/format";

const PHASE_LABELS: Record<string, string> = {
  DETECTED: "Detected",
  ACKNOWLEDGED: "Acknowledged",
  INVESTIGATING: "Investigating",
  IDENTIFIED: "Identified",
  MITIGATING: "Mitigating",
};

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function PostIncidentSummary({ incidentId, status }: { incidentId: string; status: string }) {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [failed, setFailed] = useState(false);

  // Load on mount, and load again whenever the status changes (e.g. just resolved)
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    incidentsApi
      .getSummary(incidentId)
      .then((r) => {
        if (!cancelled) setSummary(r.summary);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, status]);

  if (failed) {
    return <p className="py-6 text-center text-sm text-destructive">Could not load the summary.</p>;
  }
  if (!summary) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Loading summary...</p>;
  }

  const totalPhaseMs = summary.phases.reduce((sum, p) => sum + p.durationMs, 0);

  return (
    <div className="space-y-4">
      {summary.inProgress && (
        <div className="rounded-xl border border-sev3/30 bg-sev3/10 p-3 text-xs text-sev3">
          This incident is still in progress. The figures below are the story so far.
        </div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={summary.inProgress ? "Open for" : "Duration"} value={formatDuration(summary.durationMs)} />
        <Stat label="Time to acknowledge" value={formatDuration(summary.timeToAcknowledgeMs)} />
        <Stat label="Tasks done" value={`${summary.counts.tasksCompleted} / ${summary.counts.tasks}`} />
        <Stat label="Decisions" value={String(summary.counts.decisions)} />
      </div>

      {/* How it was resolved */}
      <Card title="Resolution">
        {summary.resolution ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{summary.resolution}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {summary.inProgress ? "Not resolved yet." : "No resolution note was recorded."}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Started {formatDateTime(summary.startedAt)}
          {summary.resolvedAt && ` · Resolved ${formatDateTime(summary.resolvedAt)}`}
          {summary.commander && ` · Commander: ${summary.commander}`}
        </p>
      </Card>

      {/* Where the time went */}
      <Card title="Time in each phase">
        {summary.phases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {summary.phases.map((p) => {
              const percent = totalPhaseMs > 0 ? (p.durationMs / totalPhaseMs) * 100 : 0;
              return (
                <div key={p.status} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">
                    {PHASE_LABELS[p.status] ?? p.status}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="tnum w-16 shrink-0 text-right text-xs text-muted-foreground">
                    {formatDuration(p.durationMs)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Who did what */}
      <Card title="Who did what">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-normal">Responder</th>
                <th className="pb-2 text-right font-normal">Tasks done</th>
                <th className="pb-2 text-right font-normal">Comments</th>
                <th className="pb-2 text-right font-normal">Decisions</th>
              </tr>
            </thead>
            <tbody>
              {summary.people.map((p) => (
                <tr key={p.userId} className="border-t border-border">
                  <td className="py-2 text-foreground">
                    {p.name}
                    {p.isCommander && (
                      <span className="ml-2 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        Commander
                      </span>
                    )}
                  </td>
                  <td className="tnum py-2 text-right text-muted-foreground">{p.tasksCompleted}</td>
                  <td className="tnum py-2 text-right text-muted-foreground">{p.comments}</td>
                  <td className="tnum py-2 text-right text-muted-foreground">{p.decisions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Decisions */}
      <Card title="Decisions made">
        {summary.decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions were logged.</p>
        ) : (
          <div className="space-y-3">
            {summary.decisions.map((d, i) => (
              <div key={i} className="text-sm">
                <p className="text-foreground">{d.decisionText}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{d.reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {d.madeBy ?? "Unknown user"} · {formatDateTime(d.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 soft-shadow">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tnum mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 soft-shadow">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}