from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlmodel import Session

from app.auth import repository, tokens
from app.auth.schemas import TokenResponse
from app.config import settings


def start_session(db: Session, user_id: UUID) -> TokenResponse:
  """Cria uma sessão de login e devolve o par de tokens dela.

  Usada no cadastro (AUTH-4) e no login (AUTH-6). Não faz commit: quem chama
  grava a sessão junto com o resto da transação.
  """
  session_id = uuid4()
  refresh_jti = uuid4()
  expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

  repository.create_session(db, user_id, session_id, refresh_jti, expires_at)

  return tokens.create_token_pair(str(user_id), str(session_id), str(refresh_jti))
