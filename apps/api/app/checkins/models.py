from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlmodel import DateTime, Field, SQLModel, func


class CheckIn(SQLModel, table=True):
  __tablename__ = "check_ins"

  id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
  user_id: UUID = Field(
    foreign_key="users.id", index=True, nullable=False, ondelete="CASCADE"
  )
  title: str = Field(max_length=150, nullable=False)
  description: str | None = Field(default=None, max_length=500)
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
  duration: timedelta | None = Field(default=None)


class CheckInHabit(SQLModel, table=True):
  """Vínculo N:N entre check-in e hábito: um check-in conta para vários hábitos."""

  __tablename__ = "check_in_habits"

  check_in_id: UUID = Field(
    foreign_key="check_ins.id", primary_key=True, ondelete="CASCADE"
  )
  habit_id: UUID = Field(
    foreign_key="habits.id", primary_key=True, ondelete="CASCADE", index=True
  )
