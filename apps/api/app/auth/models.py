from uuid import UUID, uuid4

from sqlalchemy import text
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
  """usuario. senha só como hash bcrypt."""

  __tablename__ = "users"

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  name: str = Field(max_length=100, nullable=False)
  username: str = Field(max_length=30, unique=True, nullable=False)
  email: str = Field(max_length=255, unique=True, nullable=False)
  password_hash: str = Field(max_length=60, nullable=False)
  statistics_is_public: bool = Field(
    default=False,
    nullable=False,
    sa_column_kwargs={"server_default": text("false")},
  )
