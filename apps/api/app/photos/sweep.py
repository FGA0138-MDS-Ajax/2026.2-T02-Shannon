"""Varredor de objetos órfãos de fotos no bucket."""

import argparse
import logging
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlmodel import Session

from app.photos.repository import list_all_photo_keys
from app.storage.base import Storage, StoredObject

logger = logging.getLogger(__name__)

PHOTO_KEY_PREFIX = "check-ins/"
DEFAULT_MIN_AGE = timedelta(hours=24)


@dataclass(frozen=True)
class SweepResult:
  """Resumo de uma execução do varredor de fotos órfãs."""

  listed: int
  orphans: int
  deleted: int


def find_orphan_keys(
  objects: Iterable[StoredObject],
  known_keys: set[str],
  now: datetime,
  min_age: timedelta,
) -> list[str]:
  """Devolve chaves sem registro no banco e mais antigas que `now - min_age`."""
  cutoff = now - min_age
  return [
    obj.key
    for obj in objects
    if obj.key not in known_keys and obj.last_modified < cutoff
  ]


def sweep_orphan_photos(
  db: Session,
  storage: Storage,
  now: datetime,
  min_age: timedelta = DEFAULT_MIN_AGE,
  dry_run: bool = False,
) -> SweepResult:
  """Encontra e (se não for `dry_run`) apaga objetos órfãos sob `check-ins/`."""
  known = list_all_photo_keys(db)
  objects = list(storage.list_objects(PHOTO_KEY_PREFIX))
  orphans = find_orphan_keys(objects, known, now, min_age)

  deleted = 0
  if not dry_run:
    storage.delete(orphans)
    deleted = len(orphans)

  result = SweepResult(
    listed=len(objects),
    orphans=len(orphans),
    deleted=deleted,
  )
  logger.info(
    "Varredura concluída: listed=%d orphans=%d deleted=%d dry_run=%s",
    result.listed,
    result.orphans,
    result.deleted,
    dry_run,
  )
  return result


def _parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description="Remove objetos órfãos de fotos em check-ins/ no bucket."
  )
  parser.add_argument(
    "--dry-run",
    action="store_true",
    help="Apenas lista e conta os órfãos sem apagar nada.",
  )
  return parser.parse_args()


def main() -> None:
  """Ponto de entrada do comando `python -m app.photos.sweep`."""
  from app.database import engine
  from app.storage.dependencies import get_storage

  args = _parse_args()
  logging.basicConfig(level=logging.INFO)
  with Session(engine) as session:
    result = sweep_orphan_photos(
      session,
      get_storage(),
      datetime.now(UTC),
      dry_run=args.dry_run,
    )
  print(result)


if __name__ == "__main__":
  main()
