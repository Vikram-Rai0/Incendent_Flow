// app/incidents/new/page.tsx
// Form to create a new incident
// Route: /incidents/new

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { incidentsApi } from "@/lib/api";

const SEVERITIES = [
  { value: "SEV1", label: "SEV-1 — Critical: complete outage", dot: "bg-[#ef4444]", text: "text-[#f87171]" },
  { value: "SEV2", label: "SEV-2 — Major: significant impact", dot: "bg-[#f97316]", text: "text-[#fb923c]" },
  { value: "SEV3", label: "SEV-3 — Minor: partial impact", dot: "bg-[#eab308]", text: "text-[#facc15]" },
  { value: "SEV4", label: "SEV-4 — Low: minimal impact", dot: "bg-[#94a3b8]", text: "text-[#94a3b8]" },
];

const INPUT =
  "w-full rounded-lg border border-[#242b38] bg-[#0a0d13] px-3.5 py-2.5 text-[15px] text-white placeholder-[#5f6877] focus:border-[#2f7df6] focus:outline-none focus:ring-1 focus:ring-[#2f7df6]";

export default function NewIncidentPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("SEV2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await incidentsApi.create(title, description, severity);
      // After creating, go straight to the incident room
      router.push(`/incidents/${result.incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-[#8b94a3] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-[28px] font-semibold tracking-tight text-white">Declare Incident</h1>
        <p className="mt-1 text-[15px] text-[#8b94a3]">
          Fill in the details to open a new incident room
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-[#1c222d] bg-[#0e121a] p-5 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-[#7f1d1d] bg-[#2a1215] p-3 text-sm text-[#f87171]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white">Incident title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. API latency spike on checkout service"
              required
              className={INPUT}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is happening? What is the impact?"
              required
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>

          {/* Severity */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Severity</label>
            <div className="space-y-2">
              {SEVERITIES.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    severity === s.value
                      ? "border-[#2f7df6] bg-[#0f1c33]"
                      : "border-[#242b38] bg-[#0a0d13] hover:border-[#2f3949]"
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={s.value}
                    checked={severity === s.value}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="accent-blue-500"
                  />
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2f7df6] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4a8ff8] disabled:cursor-not-allowed disabled:bg-[#1b3a6b] disabled:text-[#8b94a3]"
          >
            {loading ? "Declaring incident..." : "Declare Incident"}
          </button>
        </form>
      </div>
    </div>
  );
}