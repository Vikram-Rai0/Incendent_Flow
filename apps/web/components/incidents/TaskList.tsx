// TaskList.tsx
// Investigation tasks. Shows who owns what, handles claim conflicts.

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Task, ClaimResult } from "@/lib/api";

interface Props {
  tasks: Task[];
  currentUserId: string | undefined;
  onClaimTask: (taskId: string) => Promise<ClaimResult>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onCreateTask: (title: string) => Promise<void>;
}

// "just now", "20 seconds ago", "3 min ago"
function timeAgo(dateString: string | null) {
  if (!dateString) return "a moment ago";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs} seconds ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TaskList({ tasks, currentUserId, onClaimTask, onCompleteTask, onCreateTask }: Props) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const doneCount = tasks.filter((t) => t.status === "COMPLETED").length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAdding(true);
    try {
      await onCreateTask(newTaskTitle.trim());
      setNewTaskTitle("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setAdding(false);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-foreground">Investigation</h2>
        <div className="flex items-center gap-3">
          <span className="tnum text-xs text-muted-foreground">
            {doneCount}/{tasks.length} complete
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card soft-shadow">
        {showForm && (
          <form onSubmit={handleCreate} className="flex gap-2 border-b border-border p-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Check database connection pool"
              autoFocus
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks yet. Add one to start investigating.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                onClaim={onClaimTask}
                onComplete={onCompleteTask}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  currentUserId,
  onClaim,
  onComplete,
}: {
  task: Task;
  currentUserId: string | undefined;
  onClaim: Props["onClaimTask"];
  onComplete: Props["onCompleteTask"];
}) {
  const [busy, setBusy] = useState(false);

  // Set when we lose a claim race. Explains exactly what happened.
  const [conflict, setConflict] = useState<{ name: string; claimedAt: string | null } | null>(null);

  const isUnclaimed = task.status === "UNCLAIMED";
  const isClaimed = task.status === "CLAIMED";
  const isDone = task.status === "COMPLETED";
  const isMine = task.claimedBy === currentUserId;
  const ownerName = task.claimer?.name ?? "Someone";

  async function handleClaim() {
    setBusy(true);
    setConflict(null);
    try {
      const result = await onClaim(task.id);
      if (result.outcome === "conflict") {
        setConflict({
          name: result.task.claimer?.name ?? "Someone",
          claimedAt: result.task.claimedAt,
        });
      }
      // On success the "task:claimed" event updates the store for everyone
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await onComplete(task.id);
    } catch (err) {
      console.error("Complete failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Status marker: done = check, claimed = ring with dot, unclaimed = empty ring */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
          {isDone ? (
            <Check className="h-4 w-4 text-ok" />
          ) : isClaimed ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-sev2">
              <span className="h-1 w-1 rounded-full bg-sev2" />
            </span>
          ) : (
            <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {task.title}
          </p>
          {isUnclaimed && <p className="mt-0.5 text-xs text-muted-foreground">Unclaimed</p>}
          {isClaimed && (
            <p className={`mt-0.5 text-xs ${isMine ? "text-primary" : "text-sev3"}`}>
              {isMine ? "You are investigating this" : `${ownerName} is investigating this`}
            </p>
          )}
          {isDone && <p className="mt-0.5 text-xs text-muted-foreground">Done by {ownerName}</p>}
        </div>

        {isUnclaimed && (
          <button
            onClick={handleClaim}
            disabled={busy}
            className="shrink-0 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busy ? "Claiming..." : "Claim"}
          </button>
        )}

        {/* Only the owner sees this. The server enforces it too. */}
        {isClaimed && isMine && (
          <button
            onClick={handleComplete}
            disabled={busy}
            className="shrink-0 rounded-md border border-ok/30 bg-ok/10 px-3 py-1 text-xs font-medium text-ok transition-colors hover:bg-ok/20 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Mark done"}
          </button>
        )}
      </div>

      {conflict && (
        <div className="ml-8 mt-2 rounded-md border border-sev2/30 bg-sev2/10 p-2 text-xs text-sev2">
          <strong>Task already claimed</strong>
          <br />
          {conflict.name} claimed this task {timeAgo(conflict.claimedAt)}. The workspace has been
          synchronized.
        </div>
      )}
    </div>
  );
}