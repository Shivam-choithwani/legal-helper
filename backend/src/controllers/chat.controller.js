import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { TokenUsage } from '../models/token-usage.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { requestChat, requestDocumentChat } from '../services/ai.service.js';

export const createChat = asyncHandler(async (req, res) => {
	const chat = await Chat.create({
		userId: req.user._id,
		title: req.body.title,
	});
	res.status(201).json(chat);
});

export const listChats = asyncHandler(async (req, res) => {
	const chats = await Chat.find({ userId: req.user._id }).sort({
		lastMessageAt: -1,
	});
	res.json(chats);
});

export const getChatById = asyncHandler(async (req, res) => {
	const chat = await Chat.findOne({
		_id: req.params.id,
		userId: req.user._id,
	});
	if (!chat) {
		throw new ApiError(404, 'Chat not found');
	}

	const messages = await Message.find({ chatId: chat._id }).sort({
		createdAt: 1,
	});
	res.json({ chat, messages });
});

export const createMessage = asyncHandler(async (req, res) => {
	const chat = await Chat.findOne({
		_id: req.params.id,
		userId: req.user._id,
	});
	if (!chat) {
		throw new ApiError(404, 'Chat not found');
	}

	const { content, useRag, fileId, editMessageId } = req.body;

	if (editMessageId) {
		const edited = await Message.findOne({
			_id: editMessageId,
			chatId: chat._id,
			role: 'user',
		});
		if (!edited) {
			throw new ApiError(404, 'Message to edit not found');
		}
		edited.content = content;
		await edited.save();
	} else {
		await Message.create({
			chatId: chat._id,
			userId: req.user._id,
			role: 'user',
			content,
		});
	}

	let aiResponse;
	if (fileId) {
		aiResponse = await requestDocumentChat({
			query: content,
			fileId,
			sessionId: String(chat._id),
			userId: String(req.user._id),
		});
	} else {
		aiResponse = await requestChat({
			query: content,
			sessionId: String(chat._id),
			userId: String(req.user._id),
			useRag: false,
		});
	}

	const assistantMessage = await Message.create({
		chatId: chat._id,
		userId: req.user._id,
		role: 'assistant',
		content: aiResponse.answer,
		citations: aiResponse.citations || [],
		usage: aiResponse.tokenUsage || {},
		editedFromMessageId: editMessageId || null,
	});

	if (aiResponse.tokenUsage) {
		await TokenUsage.create({
			userId: req.user._id,
			chatId: chat._id,
			messageId: assistantMessage._id,
			provider: 'gemini',
			inputTokens: aiResponse.tokenUsage.inputTokens || 0,
			outputTokens: aiResponse.tokenUsage.outputTokens || 0,
			totalTokens: aiResponse.tokenUsage.totalTokens || 0,
		});
	}

	chat.lastMessageAt = new Date();
	if (chat.title === 'New Chat') {
		chat.title = content.slice(0, 60);
	}
	await chat.save();

	res.status(201).json(assistantMessage);
});
