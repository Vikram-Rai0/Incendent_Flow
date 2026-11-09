// app/incidents/page.tsx
// Incident list — table view with search, filters and sorting
// Route: /incidents

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { incidentsApi, Incident } from "@/lib/api";
import {
  StatusPill,
  STATUS_ORDER,
  STATUS_LABELS,
} from "@/components/incidents/StatusBadge";

// Severity chip styles (all theme tokens, so light + dark both work)
const SEVERITY_STYLES = {
  SEV1: { chip: "border-sev1/30 bg-sev1/10 text-sev1", dot: "bg-sev1" },
  SEV2: { chip: "border-sev2/30 bg-sev2/10 text-sev2", dot: "bg-sev2" },
  SEV3: { chip: "border-sev3/30 bg-sev3/10 text-sev3", dot: "bg-sev3" },
  SEV4: { chip: "border-border bg-muted text-muted-foreground", dot: "bg-sev4" },
} as const;

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;

type SortKey = "recent" | "oldest" | "severity";

type OptionalFields = {
  service?: string;
  updatedAt?: string;
};
const withOptional = (i: Incident) => i as Incident & OptionalFields;

// "SEV1" -> "SEV-1"
function sevLabel(sev: string) {
  return sev.replace(/^SEV(\d)$/, "SEV-$1");
}

function shortId(id: unknown) {
  return `INC-${String(id).slice(0, 6)}`;
}

function nameOf(x: unknown): string {
  if (typeof x === "string") return x;
  const o = x as { name?: string; user?: { name?: string } } | null | undefined;
  return o?.name ?? o?.user?.name ?? "";
}

function initialsOf(x: unknown) {
  return (
    nameOf(x)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// "18m 42s" / "2h 05m"
function formatDuration(startIso: string, endMs: number) {
  const secs = Math.max(0, Math.floor((endMs - new Date(startIso).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatAgo(iso: string | undefined, nowMs: number) {
  if (!iso) return "—";
  const secs = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("recent");
  const [now, setNow] = useState(() => Date.now());

  // Load all incidents when the page mounts
  useEffect(() => {
    async function loadIncidents() {
      try {
        const result = await incidentsApi.list();
        setIncidents(result.incidents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incidents");
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, []);

  // Keep durations and "x ago" labels fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const stamp = (i: Incident) => Date.parse(withOptional(i).updatedAt ?? i.createdAt);

    const list = incidents.filter((i) => {
      if (status !== "ALL" && i.status !== status) return false;
      if (severity !== "ALL" && i.severity !== severity) return false;
      if (!q) return true;
      const service = withOptional(i).service ?? "";
      return [i.title, shortId(i.id), service].some((v) => v.toLowerCase().includes(q));
    });

    return [...list].sort((a, b) => {
      if (sort === "oldest") return stamp(a) - stamp(b);
      if (sort === "severity") {
        return a.severity.localeCompare(b.severity) || stamp(b) - stamp(a);
      }
      return stamp(b) - stamp(a);
    });
  }, [incidents, query, status, severity, sort]);

  const filtersActive = query.trim() !== "" || status !== "ALL" || severity !== "ALL";

  function clearFilters() {
    setQuery("");
    setStatus("ALL");
    setSeverity("ALL");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading incidents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Page header */}
      <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Incidents</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {visible.length} of {incidents.length} incidents
      </p>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1 sm:max-w-[400px]">
          <span className="sr-only">Search incidents</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents…"
            className="soft-shadow h-11 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <FilterSelect label="Filter by status" value={status} onChange={setStatus} width="sm:w-48">
          <option value="ALL">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Filter by severity" value={severity} onChange={setSeverity} width="sm:w-44">
          <option value="ALL">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {sevLabel(s)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Sort incidents"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          width="sm:w-48"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="severity">Highest severity</option>
        </FilterSelect>
      </div>

      {/* Table */}
      <div className="soft-shadow mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {visible.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-foreground">
              {incidents.length === 0 ? "No incidents yet" : "No incidents match your filters"}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="text-[13px] font-medium text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Severity</th>
                  <th className="px-3 py-4 font-medium">Title</th>
                  <th className="px-3 py-4 font-medium">Status</th>
                  <th className="hidden px-3 py-4 font-medium lg:table-cell">Commander</th>
                  <th className="hidden px-3 py-4 font-medium md:table-cell">Responders</th>
                  <th className="px-3 py-4 font-medium">Duration</th>
                  <th className="hidden px-6 py-4 font-medium md:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((incident) => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                    now={now}
                    onOpen={() => router.push(`/incidents/${incident.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  width,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative w-full ${width}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="soft-shadow h-11 w-full cursor-pointer appearance-none rounded-xl border border-input bg-card pl-4 pr-10 text-[15px] text-foreground"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// Single incident row — the whole row opens the incident room
function IncidentRow({
  incident,
  now,
  onOpen,
}: {
  incident: Incident;
  now: number;
  onOpen: () => void;
}) {
  const extra = withOptional(incident);
  const sev = SEVERITY_STYLES[incident.severity];
  const finished = incident.status === "RESOLVED" || incident.status === "CLOSED";
  const endIso = extra.resolvedAt ?? extra.updatedAt;
  const endMs = finished && endIso ? new Date(endIso).getTime() : now;
  const responders = incident.responders;
  const commander =
    responders.find((r) => r.userId === incident.commanderId)?.user?.name ?? "";

  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-t border-border transition-colors hover:bg-accent/50"
    >
      <td className="px-6 py-5 align-middle">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sev.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {sevLabel(incident.severity)}
        </span>
      </td>

      <td className="px-3 py-5 align-middle">
        <Link
          href={`/incidents/${incident.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-foreground hover:underline"
        >
          {incident.title}
        </Link>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {shortId(incident.id)}
          {extra.service ? ` · ${extra.service}` : ""}
        </p>
      </td>

      <td className="px-3 py-5 align-middle">
        <StatusPill status={incident.status} />
      </td>

      <td className="hidden px-3 py-5 align-middle text-muted-foreground lg:table-cell">
        {commander || "—"}
      </td>

      <td className="hidden px-3 py-5 align-middle md:table-cell">
        {responders.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex -space-x-2">
            {responders.slice(0, 3).map((r, idx) => (
              <span
                key={idx}
                title={nameOf(r)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground ring-2 ring-card"
              >
                {initialsOf(r)}
              </span>
            ))}
            {responders.length > 3 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                +{responders.length - 3}
              </span>
            )}
          </div>
        )}
      </td>

      <td className="tnum px-3 py-5 align-middle text-muted-foreground">
        {formatDuration(incident.createdAt, endMs)}
      </td>

      <td className="hidden px-6 py-5 align-middle text-muted-foreground md:table-cell">
        {formatAgo(extra.updatedAt, now)}
      </td>
    </tr>
  );
}
