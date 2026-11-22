import logging
from collections.abc import Sequence
from datetime import UTC, date
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from app.checkins.models import CheckIn
from app.checkins.repository import APP_TIMEZONE_NAME
from app.photos.models import CheckInPhoto
from app.photos.schemas import CheckInPhotoPublic
from app.storage import Storage, StorageError

logger = logging.getLogger(__name__)

_APP_TIMEZONE = ZoneInfo(APP_TIMEZONE_NAME)


def build_photo_keys(check_in_id: UUID) -> tuple[str, str]:
  """Gera o par `(full_key, thumbnail_key)` com um `uuid4` novo a cada envio."""
  photo_id = uuid4()
  prefix = f"check-ins/{check_in_id}/{photo_id}"
  return f"{prefix}-full.jpg", f"{prefix}-thumb.jpg"


def is_check_in_from_today(check_in: CheckIn, today: date) -> bool:
  """Confere se o check-in foi criado hoje no fuso da aplicação."""
  if check_in.created_at is None:
    return False
  created_at = check_in.created_at
  if created_at.tzinfo is None:
    created_at = created_at.replace(tzinfo=UTC)
  return created_at.astimezone(_APP_TIMEZONE).date() == today


def delete_objects_safely(storage: Storage, keys: Sequence[str]) -> None:
  """Apaga objetos no bucket sem relançar `StorageError`; falhas vão para o log."""
  if not keys:
    return
  try:
    storage.delete(keys)
  except StorageError:
    logger.warning(
      "Falha ao apagar objetos do bucket: %s",
      list(keys),
      exc_info=True,
    )


def photo_public(
  storage: Storage, photo: CheckInPhoto, include_full: bool
) -> CheckInPhotoPublic:
  """Monta o `CheckInPhotoPublic` com URLs assinadas a partir do registro."""
  return CheckInPhotoPublic(
    thumbnail_url=storage.presigned_url(photo.thumbnail_key),
    url=storage.presigned_url(photo.full_key) if include_full else None,
  )
