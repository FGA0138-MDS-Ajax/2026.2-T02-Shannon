import logging
from functools import lru_cache

from app.config import settings
from app.storage.base import Storage
from app.storage.fake import FakeStorage
from app.storage.s3 import S3Storage, build_s3_client

logger = logging.getLogger(__name__)


@lru_cache
def get_storage() -> Storage:
  """Uma instância de armazenamento por processo, escolhida pela configuração."""
  if settings.storage_backend == "r2":
    return S3Storage(
      build_s3_client(settings),
      settings.r2_bucket_name or "",
      settings.photo_url_expire_minutes * 60,
    )
  logger.warning("Fotos em memória: serão perdidas ao reiniciar a API.")
  return FakeStorage(url_expires_in=settings.photo_url_expire_minutes * 60)
