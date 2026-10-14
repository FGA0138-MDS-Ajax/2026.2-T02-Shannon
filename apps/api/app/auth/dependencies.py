from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from uuid import UUID

from app.auth.exceptions import (
  unauthorized_exception,
  MSG_NOT_AUTHENTICATED,
  MSG_TOKEN_EXPIRED,
  MSG_TOKEN_INVALID,
)
from app.auth.models import User
from app.auth.tokens import TokenExpiredError, TokenInvalidError, decode_token
from app.auth.repository import get_user_by_id
from app.database import SessionDep

security = HTTPBearer(auto_error=False)


def get_current_user(
  db: SessionDep, credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> User:
  if credentials is None:
    raise unauthorized_exception(MSG_NOT_AUTHENTICATED)

  try:
    payload = decode_token(token=credentials.credentials, expected_type="access")
  except TokenExpiredError as exc:
    raise unauthorized_exception(MSG_TOKEN_EXPIRED) from exc
  except TokenInvalidError as exc:
    raise unauthorized_exception(MSG_TOKEN_INVALID) from exc

  try:
    user_id = UUID(payload.get("sub"))
  except (ValueError, TypeError, AttributeError) as exc:
    raise unauthorized_exception(MSG_TOKEN_INVALID) from exc

  user = get_user_by_id(db=db, user_id=user_id)

  if user is None:
    raise unauthorized_exception(MSG_TOKEN_INVALID)

  return user
