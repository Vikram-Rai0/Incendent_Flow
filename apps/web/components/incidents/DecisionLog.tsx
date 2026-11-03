// components/incidents/DecisionLog.tsx
// Log of important decisions made during the incident
// Separate from comments — decisions are structured and permanent

"use client";

import { useState } from "react";
import { Decision } from "@/lib/api";

interface Props {
  decisions: Decision[];
  onLogDecision: (decisionText: string, reason: string) => Promise<void>;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DecisionLog({ decisions, onLogDecision }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [decisionText, setDecisionText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!decisionText.trim() || !reason.trim()) return;
    setLoading(true);
    try {
      await onLogDecision(decisionText.trim(), reason.trim());
      setDecisionText("");
      setReason("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to log decision:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-gray-400">Structured, permanent decisions</p>
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Log decision
      </button>
    </div>

    {showForm && (
      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <input
          type="text"
          value={decisionText}
          onChange={(e) => setDecisionText(e.target.value)}
          placeholder="Decision (e.g. Rollback deployment v2.8.1)"
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (e.g. Latency increased after deployment)"
          rows={2}
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {loading ? "Logging..." : "Log decision"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )}

    {decisions.length === 0 ? (
      <p className="text-gray-600 text-sm text-center py-4">No decisions logged yet</p>
    ) : (
      <div className="divide-y divide-gray-800">
        {decisions.map((decision) => (
          <div key={decision.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm text-white font-medium">{decision.decisionText}</p>
              <span className="text-xs text-gray-500 shrink-0 font-mono">
                {formatTime(decision.createdAt)}
              </span>
            </div>
            <p className="text-xs text-gray-400">{decision.reason}</p>
            <p className="text-xs text-green-500 mt-1">{decision.status}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);
}