import { TimelineEvent } from "@/lib/api";

const EVENT_LABELS: Record<string, string> = {
  "incident.created": "Incident created",
  "incident.status_changed": "Status changed",
  "responder.joined": "Responder joined",
  "responder.added": "Responder added",
  "task.created": "Task created",
  "task.claimed": "Task claimed",
  "task.completed": "Task completed",
  "decision.created": "Decision logged",
  "comment.created": "Comment posted",
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// The extra detail line shown under an event, depending on its type
function detailOf(event: TimelineEvent): string | null {
  const p = event.payload;
  if (!p) return null;

  switch (event.type) {
    case "incident.created":
      return p.title ? String(p.title) : null;
    case "incident.status_changed":
  return p.note ? `${p.from} → ${p.to}: ${p.note}` : `${p.from} → ${p.to}`;
    case "responder.added":
      // actor = who added them, payload.name = who was added
      return p.name ? `Added ${p.name}` : null;
    case "task.created":
    case "task.claimed":
      return p.title ? String(p.title) : null;
    case "decision.created":
      return p.decisionText ? String(p.decisionText) : null;
    default:
      return null;
  }
}

interface Props {
  events: TimelineEvent[];
}

export function Timeline({ events }: Props) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
      {events.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-4">No events yet</p>
      ) : (
        <ol className="relative border-l border-gray-800 ml-1 space-y-6">
          {events.map((event, i) => {
            const detail = detailOf(event);
            // Events are oldest-first, so the newest is the LAST one
            const isLatest = i === events.length - 1;

            return (
              <li key={event.id} className="pl-6 relative">
                <span
                  className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full ${
                    isLatest ? "bg-blue-400" : "bg-gray-600"
                  }`}
                />
                <p className="text-xs text-gray-500 font-mono">
                  {formatTime(event.createdAt)}
                </p>
                <p className="text-sm text-white mt-0.5">
                  {EVENT_LABELS[event.type] ?? event.type}
                </p>

                {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}

                {event.actor && (
                  <p className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="font-medium text-gray-300">{event.actor.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400">
                      {event.actor.role}
                    </span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}