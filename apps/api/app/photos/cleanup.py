import logging
from collections.abc import Sequence

from app.storage.base import Storage, StorageError

logger = logging.getLogger(__name__)


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
