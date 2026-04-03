from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.logger import logger
from app.services.gemini_service import embed_batch          # ← batch, not one-by-one
from app.services.vector_store import upsert_chunks
from app.utils.extractors import extract_chunks

settings = get_settings()


def _notify_backend(document_id: str, status: str, error: str = "") -> None:
    if not settings.internal_api_key:
        logger.warning("Skipping backend status callback — INTERNAL_API_KEY missing")
        return

    payload = {"documentId": document_id, "status": status, "error": error}
    url     = f"{settings.backend_url}/api/documents/internal/status"
    headers = {"x-internal-api-key": settings.internal_api_key}

    with httpx.Client(timeout=20) as http:
        http.post(url, json=payload, headers=headers)


def process_document(
    file_bytes: bytes,
    filename: str,
    file_id: str,
    user_id: str,
    checksum: str,
) -> None:
    try:
       # _notify_backend(file_id, "processing")

        # ── 1. Semantic extraction via Docling ────────────────────────────────
        sem_chunks = extract_chunks(filename, file_bytes)
        if not sem_chunks:
            raise ValueError("No chunks extracted from document")

        texts         = [c.text          for c in sem_chunks]
        chunk_types   = [c.chunk_type    for c in sem_chunks]
        section_paths = [c.section_path  for c in sem_chunks]
        page_numbers  = [c.page_numbers  for c in sem_chunks]
        table_mds     = [c.table_markdown for c in sem_chunks]

        # ── 2. Batch embed (table chunks get markdown-noise removed) ──────────
        embeddings = embed_batch(
            texts=texts,
            chunk_types=chunk_types,
            task_type="RETRIEVAL_DOCUMENT",
        )

        # ── 3. Upsert into Qdrant with full semantic metadata ─────────────────
        upsert_chunks(
            file_id=file_id,
            user_id=user_id,
            checksum=checksum,
            chunks=texts,
            embeddings=embeddings,
            chunk_types=chunk_types,
            section_paths=section_paths,
            page_numbers=page_numbers,
            table_markdowns=table_mds,
        )

        #_notify_backend(file_id, "completed")
        logger.info(
            f"Document processed | file_id={file_id} "
            f"chunks={len(sem_chunks)} "
            f"tables={sum(1 for c in sem_chunks if c.chunk_type == 'table')}"
        )

    except Exception as exc:
        logger.exception("Document processing failed", exc_info=exc)
       # _notify_backend(file_id, "failed", str(exc))
