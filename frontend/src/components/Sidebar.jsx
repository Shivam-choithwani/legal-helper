export function Sidebar({ chats, activeChatId, onSelectChat, onNewChat }) {
	return (
		<aside className="w-64 flex flex-col h-screen bg-white border-r border-neutral-200 shadow-sm">
			{/* Header */}
			<div className="p-4 border-b border-neutral-200">
				<button
					onClick={onNewChat}
					className="w-full btn-primary flex items-center justify-center gap-2 text-sm font-semibold rounded-md"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					New Chat
				</button>
			</div>

			{/* Chat History */}
			<div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
				{chats.length === 0 ?
					<p className="text-caption text-center py-8 text-neutral-600">
						No chats yet
					</p>
				:	chats.map(chat => (
						<button
							key={chat._id}
							onClick={() => onSelectChat(chat._id)}
							className={`w-full text-left px-3 py-2.5 rounded-md transition-all duration-200 flex items-start gap-2 group ${
								activeChatId === chat._id ?
									'card-active text-ink font-semibold'
								:	'hover:bg-neutral-100 text-ink-light'
							}`}
							title={chat.title}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="flex-shrink-0 mt-0.5"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
							<span className="flex-1 truncate text-sm leading-tight text-left">
								{chat.title}
							</span>
						</button>
					))
				}
			</div>

			{/* Footer - User section (optional) */}
			<div className="border-t border-neutral-200 p-3">
				<button className="w-full btn-ghost text-sm justify-start">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<circle cx="12" cy="8" r="4" />
						<path d="M6 20.3a9 9 0 0 1 12 0" />
					</svg>
					Profile
				</button>
			</div>
		</aside>
	);
}
