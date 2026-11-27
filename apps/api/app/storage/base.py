"""Interface de armazenamento de arquivos (FOTO-2).

O resto da aplicação só conhece `Storage`: salvar, apagar, gerar URL assinada e
listar. Trocar o provedor (R2, Supabase) ou rodar sem rede muda só a implementação
escolhida pela configuração. A interface não conhece fotos: chaves e regras de foto
são de quem chama.
"""

from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class StorageError(Exception):
  """Falha do provedor de armazenamento.

  Toda falha vira esta exceção, para quem chama não importar `botocore`.
  """


@dataclass(frozen=True)
class StoredObject:
  """Objeto guardado: a chave e a última modificação (sempre com fuso, UTC)."""

  key: str
  last_modified: datetime


class Storage(Protocol):
  def save(self, key: str, data: bytes, content_type: str) -> None:
    """Grava o objeto; sobrescreve se a chave já existir."""
    ...

  def delete(self, keys: Sequence[str]) -> None:
    """Apaga os objetos. Lista vazia não faz nada; chave inexistente não é erro."""
    ...

  def presigned_url(self, key: str) -> str:
    """URL de leitura com a validade configurada. Sem chamada de rede."""
    ...

  def list_objects(self, prefix: str) -> Iterator[StoredObject]:
    """Lista todos os objetos com o prefixo, percorrendo todas as páginas."""
    ...
