from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    database_url: str = "sqlite:///./app/data/radiografia_bot.db"
    jwt_secret_key: str
    jwt_expire_minutes: int = 60 * 24 * 7
    google_client_id: str = ""
    firebase_project_id: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    rate_limit_analyze_per_minute: int = 10
    rate_limit_chat_per_minute: int = 30
    debug: bool = True
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.environment == "production" and self.jwt_secret_key == "cambiar-esta-clave-en-produccion":
            raise ValueError("JWT_SECRET_KEY debe configurarse en producción")


settings = Settings()