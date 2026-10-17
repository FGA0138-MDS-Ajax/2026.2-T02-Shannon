from datetime import datetime
from uuid import UUID

from sqlmodel import Session, delete, func, select, update

from app.auth.models import AuthSession, User


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
  """Busca o usuário pelo id."""
  return db.get(User, user_id)


def get_user_by_username(db: Session, username: str) -> User | None:
  """Espera `username` já normalizado (minúsculas, sem espaços nas pontas)."""
  return db.exec(select(User).where(User.username == username)).first()


def get_user_by_email(db: Session, email: str) -> User | None:
  """Espera `email` já normalizado (minúsculas, sem espaços nas pontas)."""
  return db.exec(select(User).where(User.email == email)).first()


def create_session(
  db: Session, user_id: UUID, session_id: UUID, jti: UUID, expires_at: datetime
) -> None:
  """Cria a sessão com `current_jti` = `jti`. Não faz commit."""
  db.add(
    AuthSession(id=session_id, user_id=user_id, current_jti=jti, expires_at=expires_at)
  )


def rotate_session(
  db: Session,
  session_id: UUID,
  presented_jti: UUID,
  new_jti: UUID,
  new_expires_at: datetime,
) -> UUID | None:
  """Troca o jti num único UPDATE condicional.

  Devolve o `user_id`, ou `None` se o jti não for o atual ou a sessão não existir.
  Não faz commit.
  """
  stmt = (
    update(AuthSession)
    .where(AuthSession.id == session_id, AuthSession.current_jti == presented_jti)
    .values(current_jti=new_jti, expires_at=new_expires_at, last_used_at=func.now())
    .returning(AuthSession.user_id)
  )
  return db.exec(stmt).scalar_one_or_none()


def delete_session(db: Session, session_id: UUID) -> None:
  """Apaga a sessão. Se não existir, não faz nada. Não faz commit."""
  db.exec(delete(AuthSession).where(AuthSession.id == session_id))


def delete_user_sessions(db: Session, user_id: UUID) -> None:
  """Apaga todas as sessões do usuário. Não faz commit."""
  db.exec(delete(AuthSession).where(AuthSession.user_id == user_id))
