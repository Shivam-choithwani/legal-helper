import fs from 'fs';
import path from 'path';
import { Document } from '../models/document.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import { computeChecksum } from '../utils/upload.js';
import { uploadToAiService } from '../services/ai.service.js';

export const uploadDocument = asyncHandler(async (req, res) => {
	if (!req.file) throw new ApiError(400, 'File is required');

	const fileBuffer = fs.readFileSync(req.file.path);
	const checksum = computeChecksum(fileBuffer);

	let document = await Document.findOne({ userId: req.user._id, checksum });
	if (document) return res.status(200).json({
		message: 'Document already exists, reusing existing record',
		document,
	});
	
	document = await Document.create({
		userId: req.user._id,
		filename: req.file.filename,
		originalName: req.file.originalname,
		mimeType: req.file.mimetype,
		size: req.file.size,
		storagePath: path.resolve(req.file.path),
		checksum,
		status: 'pending',
	});

	try {
		document.status = 'processing';
		await document.save();

		await uploadToAiService({
			filePath: document.storagePath,
			fileId: String(document._id),
			userId: String(req.user._id),
			checksum,
		});

		res.status(202).json({
			message: 'Processing started',
			documentId: document._id,
			status: document.status,
		});
	} catch (error) {
		document.status = 'failed';
		document.lastError = error.message;
		await document.save();
		throw new ApiError(
			502,
			'Failed to start document processing',
			error.message,
		);
	}
});

export const listDocuments = asyncHandler(async (req, res) => {
	const docs = await Document.find({ userId: req.user._id }).sort({
		createdAt: -1,
	});
	res.json(docs);
});

export const getDocumentStatus = asyncHandler(async (req, res) => {
	const doc = await Document.findOne({
		_id: req.params.id,
		userId: req.user._id,
	});
	if (!doc) {
		throw new ApiError(404, 'Document not found');
	}
	res.json({
		id: doc._id,
		status: doc.status,
		retryCount: doc.retryCount,
		lastError: doc.lastError,
		updatedAt: doc.updatedAt,
	});
});

export const retryDocument = asyncHandler(async (req, res) => {
	const doc = await Document.findOne({
		_id: req.params.id,
		userId: req.user._id,
	});
	if (!doc) {
		throw new ApiError(404, 'Document not found');
	}

	if (doc.status === 'processing') {
		throw new ApiError(409, 'Document is already processing');
	}

	doc.status = 'processing';
	doc.retryCount += 1;
	doc.lastError = '';
	await doc.save();

	try {
		await uploadToAiService({
			filePath: doc.storagePath,
			fileId: String(doc._id),
			userId: String(req.user._id),
			checksum: doc.checksum,
		});
	} catch (error) {
		doc.status = 'failed';
		doc.lastError = error.message;
		await doc.save();
		throw new ApiError(502, 'Retry failed', error.message);
	}

	res.json({ message: 'Retry started', id: doc._id, status: doc.status });
});

export const updateDocumentStatusInternal = asyncHandler(async (req, res) => {
	const { documentId, status, error } = req.body;
	const doc = await Document.findById(documentId);
	if (!doc) {
		throw new ApiError(404, 'Document not found');
	}
	doc.status = status;
	doc.lastError = error || '';
	await doc.save();
	res.json({ ok: true });
});
