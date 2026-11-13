import base64
from datetime import datetime
from uuid import UUID

from app.group.exceptions import InvalidCursorError

_CURSOR_SEPARATOR = "|"


def encode_cursor(created_at: datetime, check_in_id: UUID) -> str:
  """Cursor opaco de um item do feed: base64 url-safe de `created_at|id`.

  Sai sem o `=` do final, só com `A-Z`, `a-z`, `0-9`, `-` e `_`, e pode ir na
  URL sem escape. O app só guarda e devolve o cursor, nunca o interpreta.
  """
  raw = f"{created_at.isoformat()}{_CURSOR_SEPARATOR}{check_in_id}"
  return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
  """Inverso de `encode_cursor`: devolve `(created_at, id)`.

  Levanta `InvalidCursorError` para qualquer cursor malformado, para a rota
  responder 422 e nunca 500.
  """
  try:
    padded = cursor + "=" * (-len(cursor) % 4)
    # `validate=True` recusa caracteres fora do base64 em vez de ignorá-los.
    raw = base64.b64decode(padded.encode("ascii"), altchars=b"-_", validate=True)
    created_at, check_in_id = raw.decode().split(_CURSOR_SEPARATOR)
    return datetime.fromisoformat(created_at), UUID(check_in_id)
  except ValueError:
    # Cobre base64 inválido, texto que não é UTF-8, falta do separador, data e
    # UUID inválidos: todos são subclasses de `ValueError`.
    raise InvalidCursorError from None
