from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

import jwt

from app.config import settings


class TokenInvalidError(Exception):
  """Token Inválido (Assinatura incorreta, formato ruim, etc...)"""


class TokenExpiredError(Exception):
  """Token Expirado"""


TokenType = Literal["access", "refresh"]


def _generate_token(
  user_id: str, token_type: TokenType, duration: timedelta
) -> tuple[str, int]:
  now = datetime.now(UTC)
  iat = int(now.timestamp())
  exp = int((now + duration).timestamp())
  payload = {
    "sub": user_id,
    "iat": iat,
    "exp": exp,
    "type": token_type,
    "jti": str(uuid4()),
  }
  return (
    jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM),
    exp,
  )
