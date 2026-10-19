from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlmodel import DateTime, Field, SQLModel, func


class CheckIn(SQLModel, table=True):
  __tablename__ = "check_ins"

  id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
  user_id: UUID = Field(
    foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
  )
  habit_id: UUID = Field(
    foreign_key="habits.id", index=True, nullable=False, ondelete="CASCADE"
  )
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
  duration: timedelta | None = Field(default=None)
