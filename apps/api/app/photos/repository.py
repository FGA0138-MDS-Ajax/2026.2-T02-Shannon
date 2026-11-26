from collections.abc import Sequence
from uuid import UUID

from sqlmodel import Session, col, func, select

from app.checkins.models import CheckIn
from app.photos.models import CheckInPhoto


def get_photo(db: Session, check_in_id: UUID) -> CheckInPhoto | None:
  """Busca a foto do check-in. Não faz commit."""
  return db.get(CheckInPhoto, check_in_id)


def list_photos_by_check_in_ids(
  db: Session, check_in_ids: Sequence[UUID]
) -> dict[UUID, CheckInPhoto]:
  """Fotos de vários check-ins numa consulta só, com `IN`, por `check_in_id`.

  Check-in sem foto não aparece no dicionário. Lista vazia devolve `{}` sem
  consultar. Não faz commit.
  """
  if not check_in_ids:
    return {}

  statement = select(CheckInPhoto).where(
    col(CheckInPhoto.check_in_id).in_(check_in_ids)
  )
  return {photo.check_in_id: photo for photo in db.exec(statement).all()}


def lock_check_in(db: Session, check_in_id: UUID) -> CheckIn | None:
  """Busca o check-in travando a linha (`FOR UPDATE`) até o commit ou rollback.

  Trava o check-in, e não a foto, porque na primeira foto ainda não existe linha
  em `check_in_photos`. Assim dois envios para o mesmo check-in acontecem um de
  cada vez. Devolve `None` se o check-in não existe. Não faz commit.
  """
  statement = select(CheckIn).where(col(CheckIn.id) == check_in_id).with_for_update()
  return db.exec(statement).first()


def upsert_photo(
  db: Session, check_in_id: UUID, full_key: str, thumbnail_key: str
) -> CheckInPhoto:
  """Cria a foto do check-in ou substitui as chaves da que já existe.

  Na substituição, `updated_at` passa a ser o `now()` do banco, o mesmo relógio
  do `created_at`. Chame depois de `lock_check_in`, para que dois envios
  simultâneos não tentem criar a foto ao mesmo tempo. Faz flush, não commit.
  """
  photo = db.get(CheckInPhoto, check_in_id)
  if photo is None:
    photo = CheckInPhoto(
      check_in_id=check_in_id, full_key=full_key, thumbnail_key=thumbnail_key
    )
  else:
    photo.full_key = full_key
    photo.thumbnail_key = thumbnail_key
    photo.updated_at = func.now()

  db.add(photo)
  db.flush()
  return photo


def delete_photo(db: Session, photo: CheckInPhoto) -> None:
  """Marca a foto para exclusão. Não apaga os objetos do bucket. Não faz commit."""
  db.delete(photo)


def list_photo_keys(db: Session, check_in_ids: Sequence[UUID]) -> list[str]:
  """`full_key` e `thumbnail_key` das fotos desses check-ins, numa consulta só.

  Duas chaves por foto; check-in sem foto não contribui. Lista vazia devolve `[]`
  sem consultar. Não faz commit.
  """
  if not check_in_ids:
    return []

  statement = select(col(CheckInPhoto.full_key), col(CheckInPhoto.thumbnail_key)).where(
    col(CheckInPhoto.check_in_id).in_(check_in_ids)
  )
  return [key for row in db.exec(statement).all() for key in row]


def list_all_photo_keys(db: Session) -> set[str]:
  """Todas as chaves registradas, `full_key` e `thumbnail_key`. Não faz commit."""
  statement = select(col(CheckInPhoto.full_key), col(CheckInPhoto.thumbnail_key))
  return {key for row in db.exec(statement).all() for key in row}
