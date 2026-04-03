from __future__ import annotations

import hashlib
import time
import re
from typing import Literal

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.logger import logger

settings = get_settings()

client: genai.Client | None = None
if settings.gemini_api_key:
    client = genai.Client(api_key=str(settings.gemini_api_key))

# Gemini text-embedding-004 hard limit
_MAX_EMBED_CHARS = 9_000

_BATCH_SIZE = 100

# System instruction shared across all legal-domain generation calls
_SYSTEM_INSTRUCTION = (
    "You are Legal Helper, a professional AI legal assistant. "
    "Base your answers strictly on the provided context. "
    "If the context is insufficient, clearly state that you cannot determine "
    "the answer from the available documents. "
    "Never fabricate case names, statutes, or legal facts. "
    "Be concise, structured, and cite the relevant context sections."
)


# ── Fallback embedding (used when no API key is configured) ──────────────────

def _fallback_embedding(text: str, dim: int = 3072) -> list[float]:
    """Deterministic pseudo-random embedding — for local dev only."""
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    seed   = int.from_bytes(digest[:8], "big")
    state  = seed
    values = []
    for _ in range(dim):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        values.append((state / 0xFFFFFFFF) * 2 - 1)
    return values


# ── Embedding text pre-processing ────────────────────────────────────────────

def _clean_for_embedding(text: str, chunk_type: str = "text") -> str:
 
    if chunk_type == "table":
        # Remove [TABLE] prefix line
        text = re.sub(r"^\[TABLE\][^\n]*\n+", "", text, flags=re.MULTILINE)
        # Remove markdown separator rows  (| --- | --- |)
        text = re.sub(r"^\|[\s\-|]+\|$", "", text, flags=re.MULTILINE)
        # Replace pipe-delimited cells with comma separation for readability
        text = re.sub(r"\s*\|\s*", ", ", text)
        text = re.sub(r"^,\s*|,\s*$", "", text, flags=re.MULTILINE)
        text = re.sub(r"\n{2,}", "\n", text).strip()

    return text[:_MAX_EMBED_CHARS]


# ── Single-text embedding helpers ────────────────────────────────────────────

def embed_query(text: str) -> list[float]:
  
    if not client:
        return _fallback_embedding(text)

    cleaned = text[:_MAX_EMBED_CHARS]
    response = client.models.embed_content(
        model=settings.gemini_embed_model,
        contents=cleaned,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return response.embeddings[0].values


def embed_document(text: str, chunk_type: str = "text") -> list[float]:
   
    if not client:
        return _fallback_embedding(text)

    cleaned = _clean_for_embedding(text, chunk_type)
    response = client.models.embed_content(
        model=settings.gemini_embed_model,
        contents=cleaned,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return response.embeddings[0].values


# Backward-compatible alias (used by non-RAG /chat route)
def embed_text(text: str) -> list[float]:
    return embed_query(text)


# ── Batch embedding ──────────────────────────────────────────────────────────

def embed_batch(
    texts: list[str],
    chunk_types: list[str] | None = None,
    task_type: Literal["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"] = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    
    for model in client.models.list():
        print(model.name)
    
    """
    Embed a list of texts in batches of up to _BATCH_SIZE.
    Falls back to _fallback_embedding when no API key is set.

    Args:
        texts:       Raw chunk texts.
        chunk_types: Parallel list of chunk type labels ("table", "text", …).
                     When provided, table chunks are pre-processed before embedding.
        task_type:   Gemini task type. Use RETRIEVAL_DOCUMENT for indexing.
    """
    if not client:
        return [_fallback_embedding(t) for t in texts]
    

    types_list = chunk_types or ["text"] * len(texts)
    cleaned    = [_clean_for_embedding(t, ct) for t, ct in zip(texts, types_list)]
    all_vecs: list[list[float]] = []

    for i in range(0, len(cleaned), _BATCH_SIZE):
        batch = cleaned[i : i + _BATCH_SIZE]
        response = client.models.embed_content(
            model=settings.gemini_embed_model,
            contents=batch,
            config=types.EmbedContentConfig(task_type=task_type),
        )
        all_vecs.extend(emb.values for emb in response.embeddings)
        logger.debug(f"Embedded batch {i // _BATCH_SIZE + 1} ({len(batch)} texts)")

    return all_vecs


# ── Answer generation ────────────────────────────────────────────────────────

def generate_answer(prompt: str, retries: int = 1) -> tuple[str, dict[str, int]]:
   
    if not client:
        answer = (
            "Gemini API key is not configured. "
            "Set GEMINI_API_KEY in your .env file."
        )
        return answer, {
            "inputTokens":  len(prompt) // 4,
            "outputTokens": len(answer) // 4,
            "totalTokens":  (len(prompt) + len(answer)) // 4,
        }

    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_INSTRUCTION,
                    temperature=0.2,        # Low temperature → factual, consistent
                    max_output_tokens=2048,
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold="BLOCK_ONLY_HIGH",
                        ),
                    ],
                ),
            )
            text = response.text or "No response generated."
            meta = response.usage_metadata
            return text, {
                "inputTokens":  int(meta.prompt_token_count     or 0),
                "outputTokens": int(meta.candidates_token_count or 0),
                "totalTokens":  int(meta.total_token_count      or 0),
            }

        except Exception as exc:
            last_exc = exc
            # Retry only on server-side / transient errors
            if attempt < retries and _is_retryable(exc):
                wait = 2 ** attempt
                logger.warning(f"Gemini transient error (attempt {attempt + 1}), retrying in {wait}s: {exc}")
                time.sleep(wait)
            else:
                break

    logger.error(f"Gemini generate_answer failed: {last_exc}")
    raise last_exc  # type: ignore[misc]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ("503", "500", "rate", "quota", "timeout", "unavailable"))
