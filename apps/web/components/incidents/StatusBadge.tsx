"use client";

import { useState } from "react";
import { Incident } from "@/lib/api";
import { getAllowedTransitions, IncidentStatus } from "@/lib/statemachine";

const STATUS_ORDER = [
  "DETECTED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "IDENTIFIED",
  "MITIGATING",
  "RESOLVED",
  "CLOSED",
];

const STATUS_LABELS: Record<string, string> = {
  DETECTED: "Detected",
  ACKNOWLEDGED: "Acknowledged",
  INVESTIGATING: "Investigating",
  IDENTIFIED: "Identified",
  MITIGATING: "Mitigating",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  DETECTED: "bg-red-950 text-red-400 border-red-800",
  ACKNOWLEDGED: "bg-orange-950 text-orange-400 border-orange-800",
  INVESTIGATING: "bg-yellow-950 text-yellow-400 border-yellow-800",
  IDENTIFIED: "bg-blue-950 text-blue-400 border-blue-800",
  MITIGATING: "bg-purple-950 text-purple-400 border-purple-800",
  RESOLVED: "bg-green-950 text-green-400 border-green-800",
  CLOSED: "bg-gray-900 text-gray-500 border-gray-700",
};

// Is the target status earlier in the flow than the current status?
function isBackward(from: string, to: string) {
  return STATUS_ORDER.indexOf(to) < STATUS_ORDER.indexOf(from);
}

export function StatusPill({ status }: { status: Incident["status"] }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full border uppercase tracking-wide ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface ActionsProps {
  status: Incident["status"];
  onTransition: (newStatus: string) => Promise<void>;
}

export function StatusActions({ status, onTransition }: ActionsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Always derive fresh from status — never use stale props
  // This is why we have the state machine on the frontend too
  const transitions = getAllowedTransitions(status as IncidentStatus);

  if (transitions.length === 0) return null;

  // Primary button: the first forward transition
  const next = transitions.find((s) => !isBackward(status, s));

  async function go(target: string) {
    setOpen(false);
    setLoading(true);
    try {
      await onTransition(target);
    } catch (err) {
      console.error("Transition failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {next && (
        <button
          onClick={() => go(next)}
          disabled={loading}
          title={`Move to ${STATUS_LABELS[next]}`}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Updating..." : "Advance status ›"}
        </button>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More transitions"
        className="px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
      >
        ⋯
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1">
            {transitions.map((target) => {
              const back = isBackward(status, target);
              return (
                <button
                  key={target}
                  onClick={() => go(target)}
                  disabled={loading}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-50 ${
                    back
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {back ? "←" : "→"} {STATUS_LABELS[target]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}