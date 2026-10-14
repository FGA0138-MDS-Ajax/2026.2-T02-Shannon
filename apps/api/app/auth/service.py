from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth import repository, tokens
from app.auth.tokens import TokenInvalidError
from app.config import settings


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
