from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_port: int = 8000

    gemini_api_key: str = "AIzaSyAbYgf5Alrs3uB-h3Mh1lTH5lcEx1u662w"
    gemini_model: str = "gemini-3-flash-preview"
    gemini_embed_model: str = "models/text-embedding-004"

    qdrant_url: str = "https://8de1ab5e-0922-41f1-95c9-f34f2cdbe73a.sa-east-1-0.aws.cloud.qdrant.io"
    qdrant_api_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.9h4Sm3Foteen4-2I9z-C_y1Tu2eT_G0rOSMsakB8-jY"
    qdrant_collection: str = "rag_documents"

    backend_url: str = "http://localhost:4000"
    internal_api_key: str = "gYyBxw3960hwPKxbfLzk7osHHHz1a3H2"

    top_k: int = 5
    chunk_size: int = 1200
    chunk_overlap: int = 200


@lru_cache
def get_settings() -> Settings:
    return Settings()
