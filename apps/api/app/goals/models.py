from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import SmallInteger
from sqlmodel import DateTime, Field, Relationship, SQLModel, func

from app.habits.models import Habit


class GoalPeriod(StrEnum):
  DAY = "day"
  WEEK = "week"
  MONTH = "month"


class ScheduleType(StrEnum):
  FREQUENCY = "frequency"


class Goal(SQLModel, table=True):
  """Metas."""

  __tablename__ = "goals"

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  habit_id: UUID = Field(
    foreign_key="habits.id", unique=True, ondelete="CASCADE", nullable=False
  )
  schedule_type: ScheduleType = Field(
    default=ScheduleType.FREQUENCY, nullable=False, max_length=20
  )
  period: GoalPeriod = Field(nullable=False, max_length=10)
  target_count: int = Field(sa_type=SmallInteger, nullable=False)
  period_end_weekday: int | None = Field(sa_type=SmallInteger, default=None)
  starts_on: date = Field(nullable=False)
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
  updated_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now(), "onupdate": func.now()},
    nullable=False,
  )

  habit: Habit = Relationship(back_populates="goal")
