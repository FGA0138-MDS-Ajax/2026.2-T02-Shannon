"""Armazenamento em memória: para testes e para rodar a API sem credenciais."""

from collections.abc import Iterator, Sequence
from datetime import UTC, datetime

from app.storage.base import StorageError, StoredObject


class FakeStorage:
  """Guarda tudo num dicionário `chave -> (bytes, content_type, last_modified)`."""

  def __init__(self, url_expires_in: int = 1800) -> None:
    self.url_expires_in = url_expires_in
    self.fail_on_save = False
    self.fail_on_delete = False
    self._data: dict[str, tuple[bytes, str, datetime]] = {}

  @property
  def objects(self) -> dict[str, bytes]:
    """Chaves e bytes gravados, para os testes conferirem."""
    return {key: data for key, (data, _, _) in self._data.items()}

  def content_type(self, key: str) -> str:
    return self._data[key][1]

  def save(self, key: str, data: bytes, content_type: str) -> None:
    if self.fail_on_save:
      raise StorageError("Falha simulada ao salvar.")
    self._data[key] = (data, content_type, datetime.now(UTC))

  def delete(self, keys: Sequence[str]) -> None:
    if self.fail_on_delete:
      raise StorageError("Falha simulada ao apagar.")
    for key in keys:
      self._data.pop(key, None)

  def presigned_url(self, key: str) -> str:
    return f"https://fake-storage.local/{key}?expires={self.url_expires_in}"

  def list_objects(self, prefix: str) -> Iterator[StoredObject]:
    for key, (_, _, last_modified) in sorted(self._data.items()):
      if key.startswith(prefix):
        yield StoredObject(key=key, last_modified=last_modified)

  def set_last_modified(self, key: str, when: datetime) -> None:
    data, content_type, _ = self._data[key]
    self._data[key] = (data, content_type, when)

  def clear(self) -> None:
    self._data.clear()
    self.fail_on_save = False
    self.fail_on_delete = False
