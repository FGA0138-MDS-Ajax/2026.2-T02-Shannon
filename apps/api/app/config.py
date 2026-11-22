from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  DATABASE_URL: str
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
  REFRESH_TOKEN_EXPIRE_DAYS: int = 7
  JWT_ALGORITHM: str = "HS256"
  JWT_SECRET_KEY: str

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

  @property
  def database_url_sync(self) -> str:
    url = self.DATABASE_URL
    if url.startswith("postgres://"):
      return url.replace("postgres://", "postgresql://", 1)
    return url

  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    extra="ignore",
  )


settings = Settings()
