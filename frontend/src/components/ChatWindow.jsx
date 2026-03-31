import Markdown from 'react-markdown';
import remarkGfm from "remark-gfm";

export function ChatWindow({ messages, thinking }) {
	return (
		<div className="flex flex-col w-full h-full">
			{/* Messages Container */}
			<div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-8 space-y-6">
				{messages.length === 0 ?
					<div className="flex flex-col items-center justify-center h-full text-center py-12">
						<div className="mb-6">
							<div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="text-primary"
								>
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
								</svg>
							</div>
						</div>
						<h2 className="text-heading-lg text-ink mb-2">
							Welcome to Legal AI
						</h2>
						<p className="text-body text-neutral-600 max-w-md mb-6">
							Start a conversation by asking a legal question. Our
							AI will analyze your query and provide relevant
							legal insights.
						</p>
					</div>
				:	messages.map((msg, idx) => (
						<div
							key={msg._id || idx}
							className={`fade-up flex ${msg.role === 'user' ? 'justify-end' : 'justify-start w-full'}`}
							style={{
								animationDelay: `${idx * 50}ms`,
							}}
						>
							<div
								className={`${
									msg.role === 'user' ? 'max-w-lg' : 'w-full'
								}`}
							>
								{/* User Message */}
								{msg.role === 'user' && (
									<div className="flex gap-3 justify-end">
										<div className="bg-primary text-white rounded-lg rounded-tr-md px-4 py-3 shadow-chat-bubble">
											<p className="text-body-lg leading-relaxed">
												{msg.content}
											</p>
										</div>
									</div>
								)}

								{/* Assistant Message */}
								{msg.role === 'assistant' && (
									<div>
										<div className="markdown prose prose-sm text-body-lg leading-relaxed text-ink">
											<Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
										</div>

										{/* Citations Section */}
										{msg.citations &&
											msg.citations.length > 0 && (
												<div className="mt-4 pt-4 border-t border-neutral-200">
													<p className="text-caption font-semibold mb-2 text-neutral-600">
														📚 Sources
													</p>
													<div className="space-y-1.5">
														{msg.citations.map(
															(c, cidx) => (
																<div
																	key={`${c.documentId}-${c.chunkId}-${cidx}`}
																	className="px-3 py-2 bg-neutral-50 rounded-sm border border-neutral-100 hover:border-neutral-200 transition-colors"
																>
																	<div className="flex items-center justify-between">
																		<span className="text-caption">
																			<strong>
																				Doc{' '}
																				{
																					c.documentId
																				}
																			</strong>
																			{
																				' - '
																			}{' '}
																			Chunk{' '}
																			{
																				c.chunkId
																			}
																		</span>
																		<span className="text-caption text-neutral-500">
																			{Number(
																				c.score ||
																					0,
																			).toFixed(
																				2,
																			)}{' '}
																			relevance
																		</span>
																	</div>
																</div>
															),
														)}
													</div>
												</div>
											)}
									</div>
								)}
							</div>
						</div>
					))
				}

				{/* Thinking State */}
				{thinking && (
					<div className="fade-in flex justify-start">
						<div className="card px-4 py-3 flex items-center gap-3 max-w-sm">
							<div className="flex gap-1.5">
								{[0, 1, 2].map(i => (
									<div
										key={i}
										className="w-2 h-2 bg-neutral-400 rounded-full"
										style={{
											animation: `bounce 1.4s infinite`,
											animationDelay: `${i * 0.2}s`,
										}}
									/>
								))}
							</div>
							<span className="text-body text-neutral-600">
								Analyzing your question...
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
