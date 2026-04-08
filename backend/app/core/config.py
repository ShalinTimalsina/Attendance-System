from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Attendance System API"
    debug: bool = True
    api_prefix: str = "/api"

    postgres_user: str = "attendance_user"
    postgres_password: str = "attendance_password"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "attendance_db"

    secret_key: str = "replace-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    qr_hmac_secret: str = "replace-this-too"
    qr_token_ttl_seconds: int = 5
    session_ttl_minutes: int = 2

    use_redis_nonce_store: bool = False
    redis_url: str = "redis://localhost:6379/0"
    enforce_ip_restriction: bool = False

    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
