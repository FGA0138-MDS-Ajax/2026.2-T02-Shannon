from datetime import datetime
from uuid import UUID

from sqlmodel import DateTime, Field, SQLModel, func


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
