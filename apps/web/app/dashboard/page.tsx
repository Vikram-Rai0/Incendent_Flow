// app/incidents/page.tsx
// Shows all incidents - the main dashboard
// Route: /incidents

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Radio,
  Flame,
  Activity,
  CircleCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { incidentsApi, Incident } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const DASH = "\u2014"; // em dash
const DOT = "\u00B7"; // middle dot
const PAGE_SIZE = 5;

// Badge styles for each severity level (dot + text + border)
const SEVERITY_STYLES = {
  SEV1: { chip: "border-[#7f1d1d]/70 bg-[#2a1215] text-[#f87171]", dot: "bg-[#ef4444]", bar: "bg-[#ef4444]" },
  SEV2: { chip: "border-[#7c3a12]/70 bg-[#2a1a0f] text-[#fb923c]", dot: "bg-[#f97316]", bar: "bg-[#f59a4a]" },
  SEV3: { chip: "border-[#6b5a12]/70 bg-[#241f0c] text-[#facc15]", dot: "bg-[#eab308]", bar: "bg-[#e5c158]" },
  SEV4: { chip: "border-[#2a3442] bg-[#141a23] text-[#94a3b8]", dot: "bg-[#94a3b8]", bar: "bg-[#8fb0c9]" },
} as const;

// Status chip styles
const STATUS_CHIP: Record<string, string> = {
  DETECTED: "border-[#7f1d1d]/70 bg-[#2a1215] text-[#f87171]",
  ACKNOWLEDGED: "border-[#7c3a12]/70 bg-[#2a1a0f] text-[#fb923c]",
  INVESTIGATING: "border-[#7c3a12]/70 bg-[#2a1a0f] text-[#fb923c]",
  IDENTIFIED: "border-[#1e3a6b]/70 bg-[#0f1c33] text-[#60a5fa]",
  MITIGATING: "border-[#1e3a6b]/70 bg-[#0f1c33] text-[#60a5fa]",
  RESOLVED: "border-[#14532d]/70 bg-[#0b1f17] text-[#34d399]",
  CLOSED: "border-[#2a3442] bg-[#141a23] text-[#94a3b8]",
};

// Smaller radius + subtler border for a cleaner look
const CARD = "rounded-xl border border-[#1a2029] bg-[#0d1117]";

type Tab = "active" | "resolved";

// "SEV1" -> "SEV-1"
function sevLabel(sev: string) {
  return sev.replace(/^SEV(\d)$/, "SEV-$1");
}

// Time since the incident was created, e.g. "18m 42s" / "2h 05m"
function elapsed(dateString: string) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function initialsOf(r: unknown) {
  const x = r as { name?: string; user?: { name?: string } };
  const name = x?.name ?? x?.user?.name ?? "";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Newest first
const byNewest = (a: Incident, b: Incident) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// Compact page list, e.g. [1, "...", 4, 5, 6, "...", 12]
function pageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
    out.push(p);
  });
  return out;
}

// Smooth area chart path for the weekly chart
function buildPaths(values: number[], w: number, h: number) {
  const pad = 12;
  const max = Math.max(1, ...values);
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2 - 30)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const last = pts[pts.length - 1];
  return { line: d, area: `${d} L${last[0]},${h} L${pts[0][0]},${h} Z` };
}

export default function IncidentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [pages, setPages] = useState<Record<Tab, number>>({ active: 1, resolved: 1 });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[#8b94a3]">Loading incidents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  // ---- Values derived from the loaded incidents (display only) ----
  const activeIncidents = incidents
    .filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED")
    .sort(byNewest);
  const resolvedIncidents = incidents
    .filter((i) => i.status === "RESOLVED" || i.status === "CLOSED")
    .sort(byNewest);

  const criticalActive = activeIncidents.filter((i) => i.severity === "SEV1");
  const firstName = user?.name?.split(" ")[0];

  // Current tab list + pagination
  const list = tab === "active" ? activeIncidents : resolvedIncidents;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages[tab], totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = list.slice(start, start + PAGE_SIZE);

  const setPage = (p: number) => setPages((prev) => ({ ...prev, [tab]: p }));

  const sevCounts = (["SEV1", "SEV2", "SEV3", "SEV4"] as const).map((s) => ({
    sev: s,
    count: incidents.filter((i) => i.severity === s).length,
  }));
  const maxSev = Math.max(1, ...sevCounts.map((s) => s.count));

  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - k));
    return d;
  });
  const weekCounts = days.map(
    (d) =>
      incidents.filter((i) => {
        const c = new Date(i.createdAt);
        return c.toDateString() === d.toDateString();
      }).length
  );
  const { line, area } = buildPaths(weekCounts, 700, 200);

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white sm:text-[30px]">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#8b94a3]">
            {activeIncidents.length === 0
              ? "All systems operational"
              : `All systems under observation ${DOT} ${activeIncidents.length} ${
                  activeIncidents.length === 1 ? "incident needs" : "incidents need"
                } attention`}
          </p>
        </div>
        <button
          onClick={() => router.push("/incidents/new")}
          className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[#2563eb] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d4fd8] sm:flex"
        >
          <Plus className="h-4 w-4" />
          New Incident
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active incidents" value={String(activeIncidents.length)} sub={`${criticalActive.length} critical`} />
        <StatCard
          label="Critical"
          value={String(criticalActive.length)}
          valueClass="text-[#ef4444]"
          sub={criticalActive[0]?.title ?? "None active"}
        />
        <StatCard
          label="Resolved"
          value={String(resolvedIncidents.length)}
          valueClass="text-[#34d399]"
          sub={`of ${incidents.length} total`}
        />
        <StatCard label="Avg. resolution" value={DASH} sub="Not tracked yet" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: incidents */}
        <div className="min-w-0">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Incidents</h2>

              {/* Sliding two-option toggle */}
              <div
                role="tablist"
                className="relative grid grid-cols-2 rounded-xl border border-[#1a2029] bg-[#0d1117] p-1"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-[#1c2432] transition-transform duration-200 ease-out"
                  style={{ transform: tab === "resolved" ? "translateX(100%)" : "translateX(0)" }}
                />
                <ToggleButton
                  active={tab === "active"}
                  onClick={() => setTab("active")}
                  label="Active"
                  count={activeIncidents.length}
                />
                <ToggleButton
                  active={tab === "resolved"}
                  onClick={() => setTab("resolved")}
                  label="Resolved"
                  count={resolvedIncidents.length}
                />
              </div>
            </div>

            {visible.length > 0 ? (
              <div className="space-y-3">
                {visible.map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} />
                ))}
              </div>
            ) : (
              <div className={`${CARD} py-16 text-center`}>
                <p className="text-sm text-[#8b94a3]">
                  {tab === "active" ? "No active incidents" : "No resolved incidents"}
                </p>
                <p className="mt-1 text-xs text-[#5f6877]">
                  {tab === "active" ? "Things are running smoothly" : "Resolved incidents will show up here"}
                </p>
              </div>
            )}

            {/* Pagination */}
            {list.length > PAGE_SIZE && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-[#8b94a3]">
                  Showing {start + 1}
                  {"\u2013"}
                  {Math.min(start + PAGE_SIZE, list.length)} of {list.length}
                </p>
                <div className="flex items-center gap-1">
                  <PageBtn disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </PageBtn>
                  {pageList(page, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span key={`gap-${i}`} className="px-1 text-sm text-[#5f6877]">
                        ...
                      </span>
                    ) : (
                      <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </PageBtn>
                    )
                  )}
                  <PageBtn disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </PageBtn>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: live activity + health */}
        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Live activity</h2>
              <span className="flex items-center gap-1 text-xs text-[#34d399]">
                <Radio className="h-3 w-3" /> streaming
              </span>
            </div>
            {/* TODO: feed this from an activity/events endpoint when one exists */}
            <div className={`${CARD} px-5 py-10 text-center text-sm text-[#8b94a3]`}>
              No recent activity
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-base font-semibold text-white">Operational health</h2>
            <div className={`${CARD} divide-y divide-[#1a2029]`}>
              <HealthRow icon={<Flame className="h-4 w-4 text-[#f97316]" />} label="SLO burn rate" value={DASH} valueClass="text-[#f97316]" />
              <HealthRow icon={<Activity className="h-4 w-4 text-[#8b94a3]" />} label="Incidents (loaded)" value={String(incidents.length)} />
              <HealthRow icon={<CircleCheck className="h-4 w-4 text-[#8b94a3]" />} label="Resolved" value={String(resolvedIncidents.length)} />
            </div>
          </section>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Incidents this week</h2>
            <span className="text-[13px] text-[#8b94a3]">Last 7 days</span>
          </div>
          <div className={`${CARD} p-5`}>
            <svg viewBox="0 0 700 200" preserveAspectRatio="none" className="h-44 w-full">
              <defs>
                <linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#weekFill)" />
              <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-2 flex justify-between px-1 text-xs text-[#8b94a3]">
              {days.map((d) => (
                <span key={d.toISOString()}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Severity distribution</h2>
            <span className="text-[13px] text-[#8b94a3]">{incidents.length} total</span>
          </div>
          <div className={`${CARD} space-y-5 p-6`}>
            {sevCounts.map(({ sev, count }) => (
              <div key={sev} className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium text-white">{sevLabel(sev)}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-[#171d27]">
                  <div
                    className={`h-full rounded-sm ${SEVERITY_STYLES[sev].bar}`}
                    style={{ width: `${(count / maxSev) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-xs text-[#8b94a3]">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center gap-2 rounded px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-[#8b94a3] hover:text-white"
      }`}
    >
      {label}
      <span
        className={`rounded px-1.5 text-xs ${
          active ? "bg-[#2a3447] text-white" : "bg-[#151b25] text-[#8b94a3]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function PageBtn({
  children,
  onClick,
  active = false,
  disabled = false,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-[#2563eb] bg-[#2563eb] text-white"
          : "border-[#1a2029] bg-[#0d1117] text-[#8b94a3] hover:border-[#2a3342] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-[13px] text-[#8b94a3]">{label}</p>
      <p className={`mt-2 text-[28px] font-semibold leading-none ${valueClass}`}>{value}</p>
      <p className="mt-3 truncate text-xs text-[#6b7585]">{sub}</p>
    </div>
  );
}

function HealthRow({
  icon,
  label,
  value,
  valueClass = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {icon}
      <span className="flex-1 text-sm text-white">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// Single incident row component
// Extracted into its own component to keep the page component clean
function IncidentRow({ incident }: { incident: Incident }) {
  const sev = SEVERITY_STYLES[incident.severity];
  const description = (incident as { description?: string }).description;

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className={`${CARD} block p-5 transition-colors hover:border-[#2a3342] hover:bg-[#0f141c]`}
    >
      {/* Top: chips + elapsed time */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${sev.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
            {sevLabel(incident.severity)}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
              STATUS_CHIP[incident.status] ?? STATUS_CHIP.CLOSED
            }`}
          >
            {incident.status}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-[#8b94a3]">
          <Clock className="h-3.5 w-3.5" />
          {elapsed(incident.createdAt)}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="mt-3 text-base font-semibold text-white">{incident.title}</h3>
      {description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#8b94a3]">{description}</p>
      )}

      {/* Footer: avatars + counts + id */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#1a2029] pt-3.5 text-[13px] text-[#8b94a3]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex -space-x-2">
            {incident.responders.slice(0, 4).map((r, idx) => (
              <span
                key={idx}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0d1117] bg-[#1a202b] text-[10px] font-semibold text-white"
              >
                {initialsOf(r)}
              </span>
            ))}
          </div>
          <span className="truncate">
            {incident.tasks.length} tasks {DOT} {incident.responders.length} responders
          </span>
        </div>
        <span className="shrink-0 text-xs text-[#6b7585]">INC-{String(incident.id).slice(0, 6)}</span>
      </div>
    </Link>
  );
}