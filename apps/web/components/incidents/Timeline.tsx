import { TimelineEvent } from "@/lib/api";

const EVENT_LABELS: Record<string, string> = {
  "incident.created": "Incident created",
  "incident.status_changed": "Status changed",
  "responder.joined": "Responder joined",
  "task.created": "Task created",
  "task.claimed": "Task claimed",
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
          {events.map((event, i) => (
            <li key={event.id} className="pl-6 relative">
              <span
                className={`absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full ${
                  i === 0 ? "bg-blue-400" : "bg-gray-600"
                }`}
              />
              <p className="text-xs text-gray-500 font-mono">
                {formatTime(event.createdAt)}
              </p>
              <p className="text-sm text-white mt-0.5">
                {EVENT_LABELS[event.type] ?? event.type}
              </p>

              {event.payload && event.type === "incident.status_changed" && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {String(event.payload.from)} → {String(event.payload.to)}
                </p>
              )}

              {event.actor && (
                <p className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span className="font-medium text-gray-300">
                    {event.actor.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400">
                    {event.actor.role}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}