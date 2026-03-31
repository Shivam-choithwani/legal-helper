from __future__ import annotations

import httpx
from app.core.config import get_settings
from app.core.logger import logger
from app.services.gemini_service import embed_text
from app.services.vector_store import upsert_chunks
from app.utils.extractors import extract_text
from app.utils.text import chunk_text

settings = get_settings()


def _notify_backend(document_id: str, status: str, error: str = "") -> None:
    payload = {"documentId": document_id, "status": status, "error": error}
    url = f"{settings.backend_url}/api/documents/internal/status"
    headers = {"x-internal-api-key": settings.internal_api_key}

    with httpx.Client(timeout=20) as client:
        client.post(url, json=payload, headers=headers)


def process_document(file_bytes: bytes, filename: str, file_id: str, user_id: str, checksum: str) -> None:
    try:
        _notify_backend(file_id, "processing")
        text = extract_text(filename, file_bytes)
        if not text.strip():
            raise ValueError("No extractable text found")

        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            raise ValueError("No chunks generated from document")

        embeddings = [embed_text(chunk) for chunk in chunks]
        upsert_chunks(file_id=file_id, user_id=user_id, checksum=checksum, chunks=chunks, embeddings=embeddings)

        _notify_backend(file_id, "completed")
        logger.info("Document processed", extra={"file_id": file_id, "chunks": len(chunks)})
    except Exception as exc:
        logger.exception("Document processing failed", exc_info=exc)
        _notify_backend(file_id, "failed", str(exc))
