from __future__ import annotations

import hashlib
import json
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from docling.datamodel.base_models import InputFormat

from docling.datamodel.pipeline_options import (
    EasyOcrOptions,
    PdfPipelineOptions,
    TesseractCliOcrOptions,
    TesseractOcrOptions,
    TableFormerMode,  # <--- Add this one
)
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.types.doc import DocItemLabel, TableItem


from app.core.config import get_settings
from app.core.logger import logger

settings = get_settings()

# ── Supported extensions ──────────────────────────────────────────────────────
_PDF_EXT  = {".pdf"}
_DOCX_EXT = {".docx"}
_HTML_EXT = {".html", ".htm"}
_IMG_EXT  = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}
_ALL_EXT  = _PDF_EXT | _DOCX_EXT | _HTML_EXT | _IMG_EXT


# ── SemanticChunk ─────────────────────────────────────────────────────────────

@dataclass
class SemanticChunk:
  
    chunk_id: str
    text: str                            # What gets embedded and sent to the LLM
    chunk_type: str                      # "text" | "table" | "heading" | "figure_caption"
    source_file: str
    page_numbers: list[int] = field(default_factory=list)
    section_path: list[str] = field(default_factory=list)   # heading breadcrumb
    table_markdown: str | None = None    # full markdown table (table chunks only)


# ── Converter singleton ───────────────────────────────────────────────────────

_converter: DocumentConverter | None = None


def _get_converter() -> DocumentConverter:
    global _converter
    if _converter is not None:
        return _converter

    lang = [l.strip() for l in settings.ocr_lang.split(",") if l.strip()]

    ocr_options = None
    backend = settings.ocr_backend.lower()
    if backend == "easyocr":
        ocr_options = EasyOcrOptions(lang=lang, use_gpu=False)
    elif backend == "tesseract":
        ocr_options = TesseractOcrOptions(lang="+".join(lang))
    elif backend == "tesseract_cli":
        ocr_options = TesseractCliOcrOptions(lang="+".join(lang))
    # "mac_ocr" and "none" fall through → no OCR options (native text only)

    pdf_opts = PdfPipelineOptions(
        do_table_structure=settings.docling_table_structure,
        do_ocr=(backend != "none"),
        ocr_options=ocr_options,
        generate_picture_images=False,
    )
    pdf_opts.table_structure_options.mode = TableFormerMode.ACCURATE
    pdf_opts.table_structure_options.do_cell_matching = False
    _converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts)}
    )
    return _converter


# ── Table helper ──────────────────────────────────────────────────────────────

def _table_to_markdown(table: TableItem) -> str:
   
    try:
        return table.export_to_dataframe().to_markdown(index=False)
    except Exception:
        rows = []
        for row in table.data.grid:
            cells = [c.text.strip() if c.text else "" for c in row]
            rows.append("| " + " | ".join(cells) + " |")
        if len(rows) > 1:
            sep = "| " + " | ".join(["---"] * len(rows[0].split("|")[1:-1])) + " |"
            rows.insert(1, sep)
        return "\n".join(rows)


def _page_numbers(item) -> list[int]:
    pages = set()
    for prov in getattr(item, "prov", []):
        if hasattr(prov, "page_no"):
            pages.add(prov.page_no)
    return sorted(pages)


# ── Core extraction ───────────────────────────────────────────────────────────

def extract_chunks(filename: str, content: bytes) -> list[SemanticChunk]:
   
    ext = Path(filename).suffix.lower()
    if ext not in _ALL_EXT:
        raise ValueError(f"Unsupported file type: {ext}")

    converter = _get_converter()

    # Write bytes to a temp file so Docling can open it
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info(f"Docling converting: {filename} ({len(content)} bytes)")
        result = converter.convert(tmp_path)
        doc = result.document
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    chunker = HybridChunker(
        tokenizer="bert-base-uncased",
        max_tokens=settings.docling_max_tokens,
        merge_peers=False,
    )

    chunks: list[SemanticChunk] = []
    section_stack: list[str] = []

    for chunk in chunker.chunk(doc):
        meta      = getattr(chunk, "meta", None)
        doc_items = getattr(meta, "doc_items", []) if meta else []

        chunk_type = "text"
        table_md: str | None = None
        pages: list[int] = []

        for item in doc_items:
            pages.extend(_page_numbers(item))
            label = getattr(item, "label", None)
            
            if isinstance(item, TableItem):
                chunk_type = "table"
                table_md   = _table_to_markdown(item)

            elif label in (DocItemLabel.SECTION_HEADER, DocItemLabel.TITLE):
                chunk_type = "heading"
                level = getattr(item, "level", 1) or 1
                section_stack = section_stack[: level - 1] + [item.text]

            elif label == DocItemLabel.CAPTION:
                chunk_type = "figure_caption"

        pages = sorted(set(pages))

        # For table chunks, prepend section context in the text
        if chunk_type == "table" and table_md:
            ctx  = " > ".join(section_stack) if section_stack else ""
            text = f"[TABLE]{' | ' + ctx if ctx else ''}\n\n{table_md}"
        else:
            text = chunk.text

        chunk_id = hashlib.md5(
            f"{filename}::{pages}::{text[:80]}".encode()
        ).hexdigest()

        chunks.append(SemanticChunk(
            chunk_id=chunk_id,
            text=text,
            chunk_type=chunk_type,
            source_file=filename,
            page_numbers=pages,
            section_path=list(section_stack),
            table_markdown=table_md,
        ))

    if not chunks:
        raise ValueError("Docling produced no chunks from document")

    logger.info(
        f"Docling extracted {len(chunks)} chunks "
        f"({sum(1 for c in chunks if c.chunk_type == 'table')} tables) "
        f"from {filename}"
    )
    return chunks


# ── Backward-compatible plain-text helper (used nowhere in new flow) ──────────

def extract_text(filename: str, content: bytes) -> str:
    """Legacy helper — returns all chunk texts joined.  Prefer extract_chunks()."""
    return "\n\n".join(c.text for c in extract_chunks(filename, content))
