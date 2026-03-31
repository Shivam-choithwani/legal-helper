import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../services/api';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { MessageComposer } from '../components/MessageComposer';
import {
	appendUserMessage,
	createChat,
	fetchChat,
	sendMessage,
} from '../features/chat/chatSlice';

export function ChatPage() {
	const dispatch = useDispatch();
	const { currentChat, messages, thinking } = useSelector(s => s.chat);
	const [chats, setChats] = useState([]);

	const loadChats = async () => {
		const { data } = await api.get('/chat');
		setChats(data);
	};

	useEffect(() => {
		loadChats();
	}, []);

	const onNewChat = async () => {
		const result = await dispatch(createChat({ title: 'New Chat' }));
		if (!result.error) {
			await loadChats();
			dispatch(fetchChat(result.payload._id));
		}
	};

	const onSelectChat = id => {
		dispatch(fetchChat(id));
	};

	const onSend = async content => {
		let activeChatId = currentChat?._id;
		if (!activeChatId) {
			const result = await dispatch(createChat({ title: 'New Chat' }));
			if (result.error) return;
			activeChatId = result.payload._id;
			await loadChats();
		}

		dispatch(
			appendUserMessage({
				_id: `tmp-${Date.now()}`,
				role: 'user',
				content,
			}),
		);
		await dispatch(
			sendMessage({
				chatId: activeChatId,
				payload: { content, useRag: true },
			}),
		);
		await dispatch(fetchChat(activeChatId));
		await loadChats();
	};

	return (
		<div className="flex h-screen bg-neutral-50 overflow-hidden">
			{/* Sidebar */}
			<Sidebar
				chats={chats}
				activeChatId={currentChat?._id}
				onSelectChat={onSelectChat}
				onNewChat={onNewChat}
			/>

			{/* Main Chat Area */}
			<section className="flex-1 flex flex-col h-screen overflow-hidden">
				{/* Chat Messages Container */}
				<div className="flex-1 overflow-y-auto">
					<ChatWindow messages={messages} thinking={thinking} />
				</div>

				{/* Input Section - Sticky Bottom */}
				<div className="border-t border-neutral-200 bg-white shadow-lg">
					<MessageComposer onSend={onSend} disabled={thinking} />
				</div>
			</section>
		</div>
	);
}
