// components/incidents/CommentThread.tsx
// Discussion thread for the incident
// Comments appear in real time as others post them

"use client";

import { useState, useEffect, useRef } from "react";
import { Comment } from "@/lib/api";

interface Props {
  comments: Comment[];
  currentUserId: string | undefined;
  onPostComment: (body: string) => Promise<void>;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CommentThread({ comments, currentUserId, onPostComment }: Props) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      await onPostComment(body.trim());
      setBody("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setLoading(false);
    }
  }

  // Ctrl/Cmd+Enter to submit
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-4">Discussion</h2>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-5 space-y-5 max-h-[28rem] overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">
              No comments yet
            </p>
          ) : (
            comments.map((comment) => {
              const isMe = comment.userId === currentUserId;
              const name =
                comment.author?.name ?? (isMe ? "You" : `${comment.userId.slice(0, 8)}…`);

              return (
                <div key={comment.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {name}
                      {isMe && comment.author && (
                        <span className="text-gray-500 font-normal"> (you)</span>
                      )}
                    </span>
                    {comment.author?.role && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400">
                        {comment.author.role}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-800 p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write an update…"
            rows={3}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">Ctrl ↵ to send</span>
            <button
              type="submit"
              disabled={loading || !body.trim()}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}