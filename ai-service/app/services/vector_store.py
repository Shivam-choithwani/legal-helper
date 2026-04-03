from __future__ import annotations


import json
from uuid import uuid5, NAMESPACE_URL

from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

from app.core.config import get_settings

settings = get_settings()
client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)


def ensure_collection(vector_size: int = 3072) -> None:
    names = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection in names:
        return

    client.create_collection(
        collection_name=settings.qdrant_collection,
        vectors_config=rest.VectorParams(size=vector_size, distance=rest.Distance.COSINE),
    )


def upsert_chunks(
    file_id: str,
    user_id: str,
    checksum: str,
    chunks: list[str],
    embeddings: list[list[float]],
    # New: optional per-chunk metadata from SemanticChunk
    chunk_types: list[str] | None = None,
    section_paths: list[list[str]] | None = None,
    page_numbers: list[list[int]] | None = None,
    table_markdowns: list[str | None] | None = None,
) -> None:
    ensure_collection(len(embeddings[0]) if embeddings else 3072)
    points: list[rest.PointStruct] = []

    for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        pid = str(uuid5(NAMESPACE_URL, f"{file_id}:{idx}"))

        payload: dict = {
            "file_id":   file_id,
            "user_id":   user_id,
            "chunk_id":  str(idx),
            "text":      chunk,
            "checksum":  checksum,
            # ── Semantic metadata ────────────────────────────────────────────
            "chunk_type":    (chunk_types[idx]    if chunk_types    else "text"),
            "section_path":  json.dumps(section_paths[idx]  if section_paths  else []),
            "page_numbers":  json.dumps(page_numbers[idx]   if page_numbers   else []),
            "has_table":     bool(table_markdowns and table_markdowns[idx]),
        }

        # Store markdown table only when present (avoids bloating payloads)
        if table_markdowns and table_markdowns[idx]:
            payload["table_markdown"] = table_markdowns[idx]

        points.append(rest.PointStruct(id=pid, vector=vector, payload=payload))

    if points:
        client.upsert(collection_name=settings.qdrant_collection, points=points)


def search(
    query_embedding: list[float],
    user_id: str,
    top_k: int,
    file_id: str | None = None,
    chunk_type: str | None = None,   # e.g. "table" to retrieve only tables
):
    must = [rest.FieldCondition(key="user_id", match=rest.MatchValue(value=user_id))]
    if file_id:
        must.append(rest.FieldCondition(key="file_id", match=rest.MatchValue(value=file_id)))
    if chunk_type:
        must.append(rest.FieldCondition(key="chunk_type", match=rest.MatchValue(value=chunk_type)))

    return client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_embedding,
        query_filter=rest.Filter(must=must),
        limit=top_k,
        with_payload=True,
    )
