from datetime import date
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class HabitStatus(StrEnum):
  ACTIVE = "active"
  FINISHED = "finished"


STATUS_FINISHED_AT_CHECK = (
  f"(status = '{HabitStatus.ACTIVE.name}' AND finished_at IS NULL) OR "
  f"(status = '{HabitStatus.FINISHED.name}' AND finished_at IS NOT NULL)"
)


class Habit(SQLModel, table=True):
  __tablename__ = "habits"
  __table_args__ = (
    CheckConstraint(STATUS_FINISHED_AT_CHECK, name="ck_habits_status_finished_at"),
  )

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  name: str = Field(max_length=100, nullable=False)
  description: str | None = Field(max_length=500, nullable=True, default=None)
  category: str | None = Field(max_length=100, nullable=True, default=None)
  is_public: bool = Field(default=False, nullable=False)
  status: HabitStatus = Field(default=HabitStatus.ACTIVE, nullable=False, index=True)
  author_user_id: UUID = Field(
    foreign_key="users.id", nullable=False, ondelete="CASCADE", index=True
  )
  created_at: date = Field(nullable=False)
  target_end_date: date | None = Field(default=None)
  finished_at: date | None = Field(default=None)
