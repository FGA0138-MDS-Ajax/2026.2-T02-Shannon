from uuid import UUID

from sqlmodel import Session, select

from app.auth.models import User


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
  return db.get(User, user_id)


def get_user_by_username(db: Session, username: str) -> User | None:
  return db.exec(select(User).where(User.username == username)).first()


def get_user_by_email(db: Session, email: str) -> User | None:
  """Espera `email` já normalizado (minúsculas, sem espaços nas pontas)."""
  return db.exec(select(User).where(User.email == email)).first()
