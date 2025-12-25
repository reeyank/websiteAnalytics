from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # JWT Settings
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production-please"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OAuth Settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # App Settings
    FRONTEND_URL: str = "https://publickeyboard.com"
    BACKEND_URL: str = "https://api.publickeyboard.com"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
