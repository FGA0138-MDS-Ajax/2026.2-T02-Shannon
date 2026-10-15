from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth import repository, tokens
from app.auth.tokens import TokenInvalidError
from app.config import settings
from app.auth.exceptions import InvalidUser
from app.auth import security
# from app.auth import session_service


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


def login(db, username, password):

  if "@" in username:

    user = repository.get_user_by_email(db, username)

  else : 

    user = repository.get_user_by_username(db, username)

  if user is None:

    raise InvalidUser

  response_verify = security.verify_password(password, user.password_hash)

  if response_verify:

    return #session_service.start_service(db, user.id)

  else:

    raise InvalidUser