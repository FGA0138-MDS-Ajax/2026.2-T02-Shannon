from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_postgres_url(url: str) -> str:
  if url.startswith("postgres://"):
    return url.replace("postgres://", "postgresql://", 1)
  return url


def parse_cors_origins(raw: str) -> list[str]:
  stripped = raw.strip()
  if not stripped or stripped == "*":
    return ["*"]
  origins = [item.strip().rstrip("/") for item in stripped.split(",") if item.strip()]
  return origins or ["*"]


class Settings(BaseSettings):
  DATABASE_URL: str
  DIRECT_DATABASE_URL: str | None = None
  CORS_ORIGINS: str = ""
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
  REFRESH_TOKEN_EXPIRE_DAYS: int = 7
  JWT_ALGORITHM: str = "HS256"
  # HS256 pede um segredo longo: abaixo de 32 caracteres fica fácil de quebrar.
  JWT_SECRET_KEY: str = Field(min_length=32)

  # Definida pela própria Vercel em cada deploy ("production", "preview"...).
  VERCEL_ENV: str = ""
  # Reabre /docs, /redoc e /openapi.json em produção
  ENABLE_DOCS: bool = False

  # Armazenamento de fotos (FOTO-2). `memory` serve para rodar sem credenciais.
  storage_backend: Literal["r2", "memory"] = "memory"
  r2_endpoint_url: str | None = None
  r2_access_key_id: str | None = None
  r2_secret_access_key: str | None = None
  r2_bucket_name: str | None = None
  photo_url_expire_minutes: int = 30

  @model_validator(mode="after")
  def _require_r2_settings(self) -> Self:
    if self.storage_backend == "r2":
      missing = [
        name.upper()
        for name in (
          "r2_endpoint_url",
          "r2_access_key_id",
          "r2_secret_access_key",
          "r2_bucket_name",
        )
        if not getattr(self, name)
      ]
      if missing:
        raise ValueError(
          f"STORAGE_BACKEND=r2 exige as variáveis: {', '.join(missing)}."
        )
    return self

  @model_validator(mode="after")
  def _require_cors_in_production(self) -> Self:
    if self.is_production and self.cors_origins_list == ["*"]:
      raise ValueError('CORS_ORIGINS é obrigatória em produção e não pode ser "*".')
    return self

  @property
  def is_production(self) -> bool:
    return self.VERCEL_ENV == "production"

  @property
  def database_url_sync(self) -> str:
    return _normalize_postgres_url(self.DATABASE_URL)

  @property
  def database_url_migrations(self) -> str:
    if self.DIRECT_DATABASE_URL:
      return _normalize_postgres_url(self.DIRECT_DATABASE_URL)
    return self.database_url_sync

  @property
  def cors_origins_list(self) -> list[str]:
    return parse_cors_origins(self.CORS_ORIGINS)

  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="ignore",
  )


settings = Settings()
