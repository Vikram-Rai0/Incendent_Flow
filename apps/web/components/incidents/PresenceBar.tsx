interface PresenceUser {
  userId: string;
  userName: string;
}

interface Props {
  onlineUsers: PresenceUser[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PresenceBar({ onlineUsers }: Props) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-4">
        Responders
        <span className="text-gray-500 font-normal text-sm ml-2">
          ({onlineUsers.length} online)
        </span>
      </h2>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {onlineUsers.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No one online</p>
        ) : (
          onlineUsers.map((user) => (
            <div key={user.userId} className="flex items-center gap-3 p-4">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-medium text-gray-200">
                  {initials(user.userName)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-gray-900" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.userName}</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}