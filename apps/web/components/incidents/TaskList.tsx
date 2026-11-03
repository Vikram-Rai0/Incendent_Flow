"use client";

import { useState } from "react";
import { Task } from "@/lib/api";

interface Props {
  tasks: Task[];
  currentUserId: string | undefined;
  onClaimTask: (taskId: string) => Promise<{
    outcome: "claimed" | "conflict";
    task?: Task;
    claimedBy?: string;
    claimedAt?: string;
  }>;
  onCreateTask: (title: string) => Promise<void>;
}

export function TaskList({ tasks, currentUserId, onClaimTask, onCreateTask }: Props) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const done = tasks.filter((t) => t.status === "COMPLETED").length;

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await onCreateTask(newTaskTitle.trim());
      setNewTaskTitle("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setAddingTask(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Investigation</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add task
          </button>
          <span className="text-xs text-gray-500">
            {done}/{tasks.length} complete
          </span>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateTask} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Check database connection pool"
            autoFocus
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={addingTask}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
        {tasks.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">
            No tasks yet — add one to start investigating
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onClaim={onClaimTask}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  currentUserId,
  onClaim,
}: {
  task: Task;
  currentUserId: string | undefined;
  onClaim: Props["onClaimTask"];
}) {
  const [claiming, setClaiming] = useState(false);
  const [conflict, setConflict] = useState<{
    claimedBy: string;
    claimedAt: string;
  } | null>(null);

  const isClaimedByMe = task.claimedBy === currentUserId;
  const isClaimed = task.status === "CLAIMED";
  const isCompleted = task.status === "COMPLETED";

  async function handleClaim() {
    setClaiming(true);
    setConflict(null);
    try {
      const result = await onClaim(task.id);
      if (result.outcome === "conflict") {
        setConflict({
          claimedBy: result.claimedBy!,
          claimedAt: result.claimedAt!,
        });
      }
      // On success, the Socket.IO "task:claimed" event updates the store
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setClaiming(false);
    }
  }

  const subtitle = isCompleted
    ? "Completed"
    : isClaimed
    ? isClaimedByMe
      ? "Claimed by you"
      : `Claimed by ${task.claimedBy?.slice(0, 8)}…`
    : "Unclaimed";

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="shrink-0">
          {isCompleted ? (
            <span className="flex w-5 h-5 items-center justify-center text-green-400 text-sm">✓</span>
          ) : isClaimed ? (
            <span className="block w-5 h-5 rounded-full border-2 border-orange-400" />
          ) : (
            <span className="block w-5 h-5 rounded-full border-2 border-gray-600" />
          )}
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isCompleted ? "line-through text-gray-500" : "text-white"}`}>
            {task.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Claim button */}
        {!isClaimed && !isCompleted && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="shrink-0 text-xs px-4 py-1.5 bg-gray-950 hover:bg-gray-800 disabled:opacity-50 text-white border border-gray-700 rounded-lg transition-colors"
          >
            {claiming ? "Claiming..." : "Claim"}
          </button>
        )}
      </div>

      {conflict && (
        <div className="mt-3 p-3 bg-orange-950/60 border border-orange-800 rounded-lg text-xs text-orange-400">
          <strong>Task already claimed</strong>
          <br />
          Someone else claimed this task just before you. The workspace has been synchronized.
        </div>
      )}
    </div>
  );
}