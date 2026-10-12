from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID, uuid4

import jwt

from app.auth.schemas import TokenResponse
from app.config import settings


class TokenInvalidError(Exception):
  """Token Inválido (Assinatura incorreta, formato ruim, etc...)"""


class TokenExpiredError(Exception):
  """Token Expirado"""


TokenType = Literal["access", "refresh"]


def _create_token(
  user_id: str,
  token_type: TokenType,
  duration: timedelta,
  sid: str | None = None,
  jti: str | None = None,
) -> tuple[str, int]:
  """Generaliza a criação de tokens. Codifica a payload"""

  now = datetime.now(UTC)
  iat = int(now.timestamp())
  exp = int((now + duration).timestamp())
  jti = jti if jti is not None else str(uuid4())
  payload = {
    "sub": user_id,
    "iat": iat,
    "exp": exp,
    "type": token_type,
    "jti": jti,
  }
  if sid is not None:
    payload["sid"] = sid

  return (
    jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM),
    exp,
  )


def create_access_token(
  user_id: str, expires_delta: timedelta | None = None
) -> tuple[str, int]:
  """Cria token de acesso. É possível passar um delta personalizado"""

  if expires_delta is None:
    duration = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
  else:
    duration = expires_delta

  return _create_token(user_id=user_id, token_type="access", duration=duration)


def create_refresh_token(
  user_id: str, session_id: str, jti: str, expires_delta: timedelta | None = None
) -> str:
  """Cria token refresh. É possível passar um delta personalizado"""

  if expires_delta is None:
    duration = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
  else:
    duration = expires_delta

  token, _ = _create_token(
    user_id=user_id, token_type="refresh", sid=session_id, jti=jti, duration=duration
  )

  return token


def create_token_pair(user_id: str, session_id: str, refresh_jti: str) -> TokenResponse:
  """Empacota os access e refresh tokens para RESPONSE via JSON"""

  access_token, access_exp = create_access_token(user_id)
  refresh_token = create_refresh_token(user_id, session_id, refresh_jti)

  return TokenResponse(
    access_token=access_token,
    refresh_token=refresh_token,
    exp=access_exp,
  )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
  """Decodifica tokens para verificação e validação"""

  try:
    payload = jwt.decode(
      token,
      settings.JWT_SECRET_KEY,
      algorithms=[settings.JWT_ALGORITHM],
      options={"require": ["exp", "sub"]},
    )
  except jwt.ExpiredSignatureError as exc:
    raise TokenExpiredError from exc
  except jwt.InvalidTokenError as exc:
    raise TokenInvalidError from exc

  if payload.get("type") != expected_type:
    raise TokenInvalidError

  if expected_type == "refresh":
    if "sid" not in payload or "jti" not in payload:
      raise TokenInvalidError
    try:
      UUID(payload.get("sid"))
      UUID(payload.get("jti"))
    except (ValueError, TypeError, AttributeError) as exc:
      raise TokenInvalidError from exc

  return payload
