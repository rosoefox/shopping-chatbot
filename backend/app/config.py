from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "Shopping Review Search API"
    csv_path: Path = BASE_DIR / "samples" / "review.csv"
    chroma_dir: Path = BASE_DIR / "chroma_db"
    collection_name: str = "shopping_reviews"
    embedding_model: str = "models/gemini-embedding-001"
    llm_model: str = "gemini-3.1-flash-lite"
    google_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
            "REVIEW_API_GOOGLE_API_KEY",
        ),
    )
    search_k: int = 5
    index_batch_size: int = 50
    index_batch_delay_seconds: float = 65.0

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="REVIEW_API_",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
