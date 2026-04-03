from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_port: int = 8000

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"
    gemini_embed_model: str = "models/gemini-embedding-001"

    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "legal_helper_chunks"

    backend_url: str = "http://localhost:4000"
    internal_api_key: str = ""

    top_k: int = 5
    
    chunk_size: int = 1200
    chunk_overlap: int = 200

    # ── Docling ingestion ────────────────────────────────────────────────────
    # OCR backend: "easyocr" | "tesseract" | "tesseract_cli" | "mac_ocr" | "none"
    ocr_backend: str = "easyocr"
   
    ocr_lang: str = "en"
  
    docling_table_structure: bool = True
   
    docling_max_tokens: int = 512


@lru_cache
def get_settings() -> Settings:
    return Settings()
