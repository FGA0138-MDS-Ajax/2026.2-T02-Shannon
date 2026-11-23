import logging
from collections.abc import Sequence
from datetime import UTC, date
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from sqlmodel import Session

from app.auth.models import User
from app.checkins.exceptions import CheckInNotFoundError
from app.checkins.models import CheckIn
from app.checkins.repository import APP_TIMEZONE_NAME
from app.checkins.service import get_owned_check_in
from app.habits import service as habits_service
from app.photos import repository as photos_repository
from app.photos.exceptions import PhotoNotTodayError
from app.photos.processing import OUTPUT_CONTENT_TYPE, process_photo
from app.photos.public import photo_public
from app.photos.schemas import CheckInPhotoPublic
from app.storage.base import Storage, StorageError
from app.storage.dependencies import get_storage

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


def set_check_in_photo(
  db: Session,
  check_in_id: UUID,
  user: User,
  data: bytes,
  storage: Storage | None = None,
) -> CheckInPhotoPublic:
  """Define ou substitui a foto de um check-in de hoje,
  mantendo banco e bucket consistentes."""
  storage = storage or get_storage()

  # 1. Garante que o check-in existe, é visível e pertence ao usuário.
  check_in = get_owned_check_in(db, check_in_id, user)

  # 2. Só check-in feito hoje no fuso da aplicação aceita alteração de foto.
  if not is_check_in_from_today(check_in, habits_service.today()):
    raise PhotoNotTodayError

  # 3. Valida e regrava a imagem fora de transação de escrita/trava.
  processed = process_photo(data)

  # 4. Sobe cheia e miniatura antes de gravar no banco; se falhar, limpa o que subiu.
  full_key, thumbnail_key = build_photo_keys(check_in_id)
  try:
    storage.save(full_key, processed.full, OUTPUT_CONTENT_TYPE)
    storage.save(thumbnail_key, processed.thumbnail, OUTPUT_CONTENT_TYPE)
  except StorageError:
    delete_objects_safely(storage, (full_key, thumbnail_key))
    raise

  # 5. Trava o check-in só agora para serializar envios simultâneos.
  if photos_repository.lock_check_in(db, check_in_id) is None:
    delete_objects_safely(storage, (full_key, thumbnail_key))
    raise CheckInNotFoundError

  # 6. Guarda as chaves antigas, grava as novas e commita;
  # falha no commit limpa as novas.
  old_photo = photos_repository.get_photo(db, check_in_id)
  old_keys = (
    (old_photo.full_key, old_photo.thumbnail_key) if old_photo is not None else ()
  )
  photo = photos_repository.upsert_photo(db, check_in_id, full_key, thumbnail_key)
  try:
    db.commit()
  except Exception:
    db.rollback()
    delete_objects_safely(storage, (full_key, thumbnail_key))
    raise
  db.refresh(photo)

  # 7. Só depois do commit apaga os objetos antigos (falha aqui vira apenas log/órfão).
  delete_objects_safely(storage, old_keys)

  # 8. Devolve as URLs assinadas (com a versão cheia incluída).
  return photo_public(storage, photo, include_full=True)


def remove_check_in_photo(
  db: Session,
  check_in_id: UUID,
  user: User,
  storage: Storage | None = None,
) -> None:
  """Remove a foto de um check-in de hoje; sem foto, não faz nada (idempotente)."""
  storage = storage or get_storage()

  # 1. Valida posse e se o check-in é de hoje (404 / 403 / 409).
  check_in = get_owned_check_in(db, check_in_id, user)
  if not is_check_in_from_today(check_in, habits_service.today()):
    raise PhotoNotTodayError

  # 2. Trava o check-in para evitar corrida com um PUT simultâneo.
  if photos_repository.lock_check_in(db, check_in_id) is None:
    raise CheckInNotFoundError

  photo = photos_repository.get_photo(db, check_in_id)
  if photo is None:
    return

  # 3. Guarda as chaves, marca para exclusão e commita antes de tocar no bucket.
  keys = (photo.full_key, photo.thumbnail_key)
  photos_repository.delete_photo(db, photo)
  db.commit()

  # 4. Só depois do commit apaga os objetos do bucket (falha aqui vira apenas log).
  delete_objects_safely(storage, keys)
