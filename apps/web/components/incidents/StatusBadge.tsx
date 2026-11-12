"use client";

import { useState } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Incident } from "@/lib/api";
import { getAllowedTransitions, IncidentStatus } from "@/lib/statemachine";

export const STATUS_ORDER = [
  "DETECTED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "IDENTIFIED",
  "MITIGATING",
  "RESOLVED",
  "CLOSED",
];

export const STATUS_LABELS: Record<string, string> = {
  DETECTED: "Detected",
  ACKNOWLEDGED: "Acknowledged",
  INVESTIGATING: "Investigating",
  IDENTIFIED: "Identified",
  MITIGATING: "Mitigating",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Theme-aware: every color comes from the tokens in globals.css,
// so these work in both light and dark mode.
const STATUS_COLORS: Record<string, string> = {
  DETECTED: "border-sev1/30 bg-sev1/10 text-sev1",
  ACKNOWLEDGED: "border-sev3/30 bg-sev3/10 text-sev3",
  INVESTIGATING: "border-sev2/30 bg-sev2/10 text-sev2",
  IDENTIFIED: "border-chart-5/30 bg-chart-5/10 text-chart-5",
  MITIGATING: "border-primary/30 bg-primary/10 text-primary",
  RESOLVED: "border-ok/30 bg-ok/10 text-ok",
  CLOSED: "border-border bg-muted text-muted-foreground",
};

// Is the target status earlier in the flow than the current status?
function isBackward(from: string, to: string) {
  return STATUS_ORDER.indexOf(to) < STATUS_ORDER.indexOf(from);
}

export function StatusPill({ status }: { status: Incident["status"] }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface ActionsProps {
  status: Incident["status"];
  onTransition: (newStatus: string, note?: string) => Promise<void>;
}

export function StatusActions({ status, onTransition }: ActionsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolving needs a written explanation, so we ask for it first
  const [resolveOpen, setResolveOpen] = useState(false);
  const [note, setNote] = useState("");

  // Always derive fresh from status, never from stale props
  const transitions = getAllowedTransitions(status as IncidentStatus);

  if (transitions.length === 0) return null;

  const next = transitions.find((s) => !isBackward(status, s));

  async function run(target: string, resolutionNote?: string) {
    setOpen(false);
    setError(null);
    setLoading(true);
    try {
      await onTransition(target, resolutionNote);
      setResolveOpen(false);
      setNote("");
    } catch (err) {
      // The server's explanation, e.g. "The status was just changed by someone else"
      setError(err instanceof Error ? err.message : "Could not change status");
    } finally {
      setLoading(false);
    }
  }

  // Resolving opens the dialog. Every other status goes straight through.
  function choose(target: string) {
    setOpen(false);
    if (target === "RESOLVED") {
      setError(null);
      setResolveOpen(true);
    } else {
      run(target);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {error && <span className="max-w-[220px] text-right text-xs text-destructive">{error}</span>}

      {next && (
        <button
          onClick={() => choose(next)}
          disabled={loading}
          title={`Move to ${STATUS_LABELS[next]}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Advance status"}
          {!loading && <ChevronRight className="h-4 w-4" />}
        </button>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More transitions"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-lg border border-border bg-popover py-1 shadow-xl">
            {transitions.map((target) => {
              const back = isBackward(status, target);
              return (
                <button
                  key={target}
                  onClick={() => choose(target)}
                  disabled={loading}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 ${
                    back ? "text-sev2" : "text-popover-foreground"
                  }`}
                >
                  {back ? "←" : "→"} {STATUS_LABELS[target]}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Resolve dialog */}
      {resolveOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("RESOLVED", note.trim());
            }}
            className="w-full max-w-md space-y-3 rounded-xl border border-border bg-popover p-5 shadow-xl"
          >
            <h2 className="text-sm font-medium text-popover-foreground">Resolve incident</h2>
            <p className="text-xs text-muted-foreground">
              Describe how it was resolved. This becomes part of the permanent incident record.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Rolled back v2.8.1; connection pool recovered within 3 minutes"
              rows={4}
              autoFocus
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolveOpen(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || note.trim().length < 10}
                className="rounded-md bg-ok px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Resolving..." : "Resolve incident"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}