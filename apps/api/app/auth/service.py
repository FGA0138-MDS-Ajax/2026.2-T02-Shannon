from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.auth import repository, tokens
from app.auth.exceptions import EmailTakenError, UsernameTakenError
from app.auth.models import User
from app.auth.schemas import SignupRequest, SignupResponse, UserPublic
from app.auth.security import hash_password
from app.auth.session_service import start_session
from app.auth.tokens import TokenExpiredError, TokenInvalidError
from app.config import settings


def _ensure_available(db: Session, username: str, email: str) -> None:
  """Levanta `UsernameTakenError` ou `EmailTakenError` se já estiverem em uso."""
  if repository.get_user_by_username(db, username) is not None:
    raise UsernameTakenError
  if repository.get_user_by_email(db, email) is not None:
    raise EmailTakenError


def register_user(db: Session, data: SignupRequest) -> SignupResponse:
  """Cria a conta e a primeira sessão no mesmo commit.

  A checagem prévia dá a mensagem certa no caso comum. Se outro cadastro igual
  for gravado entre a checagem e o INSERT, o UNIQUE do banco gera
  `IntegrityError` (no flush ou no commit): desfaz tudo e checa de novo.
  """
  _ensure_available(db, data.username, data.email)

  user = User(
    name=data.name,
    username=data.username,
    email=data.email,
    password_hash=hash_password(data.password),
  )

  try:
    db.add(user)
    db.flush()
    token = start_session(db, user.id)
    db.commit()
  except IntegrityError:
    db.rollback()
    _ensure_available(db, data.username, data.email)
    raise

  return SignupResponse(user=UserPublic.model_validate(user), token=token)


def refresh_session(db, refresh_token: str):
  """Renova o par de tokens trocando o jti da sessão.

  Se o refresh não for o atual da sessão (reuso), apaga a sessão e
  levanta `TokenInvalidError`.
  """
  payload = tokens.decode_token(refresh_token, "refresh")

  sid = UUID(payload["sid"])
  jti = UUID(payload["jti"])

  new_jti = uuid4()
  new_expires_at = datetime.now(UTC) + timedelta(
    days=settings.REFRESH_TOKEN_EXPIRE_DAYS
  )

  user_id = repository.rotate_session(db, sid, jti, new_jti, new_expires_at)

  if user_id:
    user_id_str = str(user_id)
    sid_str = str(sid)
    new_jti_str = str(new_jti)

    token_response = tokens.create_token_pair(user_id_str, sid_str, new_jti_str)
    db.commit()
    return token_response

  else:
    repository.delete_session(db, sid)
    db.commit()
    raise TokenInvalidError


def logout_session(db: Session, refresh_token: str) -> None:
  """Encerra a sessão do refresh token. Nunca falha (logout é idempotente).

  Token inválido ou expirado não apaga nada. A sessão é apagada pelo `sid`,
  sem conferir o `jti`: um refresh antigo da mesma sessão também a encerra.
  """
  try:
    payload = tokens.decode_token(refresh_token, "refresh")
    sid = UUID(payload["sid"])
  except (TokenExpiredError, TokenInvalidError, KeyError, ValueError, TypeError):
    return

  repository.delete_session(db, sid)
  db.commit()
