from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import DateTime, Field, SQLModel, func


class User(SQLModel, table=True):
  """usuario. senha só como hash bcrypt."""

  __tablename__ = "users"

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  name: str = Field(max_length=100, nullable=False)
  username: str = Field(max_length=30, unique=True, nullable=False)
  email: str = Field(max_length=255, unique=True, nullable=False)
  password_hash: str = Field(max_length=60, nullable=False)


class AuthSession(SQLModel, table=True):
  """sessão de login (um aparelho). guarda só o jti do refresh válido agora."""

  __tablename__ = "auth_sessions"

  # sem default: quem cria a sessão informa o id, que vai no refresh como `sid`
  id: UUID = Field(primary_key=True)
  user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
  current_jti: UUID = Field(nullable=False)
  expires_at: datetime = Field(sa_type=DateTime(timezone=True), nullable=False)
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
  last_used_at: datetime | None = Field(
    default=None, sa_type=DateTime(timezone=True), nullable=True
  )
