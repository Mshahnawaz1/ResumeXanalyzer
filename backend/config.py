"""Application configuration — loaded once at startup."""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    llm_provider: str = os.getenv("LLM_PROVIDER", "openrouter")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "inclusionai/ling-3.0-flash:free")
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "")

    @property
    def provider(self) -> str:
        return self.llm_provider.lower()

    @property
    def active_model(self) -> str:
        return self.openrouter_model if self.provider == "openrouter" else self.gemini_model

    def validate(self) -> None:
        provider = self.provider
        if provider == "gemini":
            if not self.gemini_api_key:
                raise ValueError("GEMINI_API_KEY is not set in .env")
        elif provider == "openrouter":
            if not self.openrouter_api_key:
                raise ValueError("OPENROUTER_API_KEY is not set in .env")
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {self.llm_provider}")


settings = Settings()
