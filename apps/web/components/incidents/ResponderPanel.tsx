// ResponderPanel.tsx
// Everyone with access, who is online, and what each person is working on.
// "What they are working on" is DERIVED from claimed tasks, never typed in.

"use client";

import { useState } from "react";
import { Responder, Task } from "@/lib/api";

interface PresenceUser {
  userId: string;
  userName: string;
}

interface Props {
  responders: Responder[];
  tasks?: Task[];
  onlineUsers: PresenceUser[];
  currentUserId: string | undefined;
  onAddResponder: (email: string) => Promise<string>;
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ResponderPanel({
  responders,
  tasks = [], // safe default: no tasks means nobody has a current task
  onlineUsers,
  currentUserId,
  onAddResponder,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const onlineIds = new Set(onlineUsers.map((u) => u.userId));
  function isOnline(userId: string) {
    return userId === currentUserId || onlineIds.has(userId);
  }

  // The task this person has claimed and not finished yet (if any)
  function currentTask(userId: string) {
    return tasks.find((t) => t.status === "CLAIMED" && t.claimedBy === userId);
  }

  // Online people first
  const sorted = [...responders].sort(
    (a, b) => Number(isOnline(b.userId)) - Number(isOnline(a.userId))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const text = await onAddResponder(email.trim());
      setMessage({ text, isError: false });
      setEmail("");
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to add responder",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center">
        <h2 className="text-[15px] font-semibold text-foreground">
          Responders
          <span className="tnum ml-2 text-xs font-normal text-muted-foreground">
            ({responders.length})
          </span>
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card soft-shadow">
        <div className="divide-y divide-border">
          {sorted.map((r) => {
            const online = isOnline(r.userId);
            const doing = currentTask(r.userId);
            const name = r.user?.name ?? r.userId.slice(0, 8);
            return (
              <div key={r.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[11px] font-semibold text-foreground">
                  {getInitials(r.user?.name)}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      online ? "bg-ok" : "bg-muted-foreground/50"
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      online ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {name}
                    {r.userId === currentUserId && " (you)"}
                  </p>
                  {doing ? (
                    <p className="truncate text-xs text-primary">→ {doing.title}</p>
                  ) : (
                    !online && <p className="text-xs text-muted-foreground">Offline</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 border-t border-border p-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Add by email"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-md border border-border bg-secondary py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add responder"}
          </button>
          {message && (
            <p className={`text-xs ${message.isError ? "text-destructive" : "text-ok"}`}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}