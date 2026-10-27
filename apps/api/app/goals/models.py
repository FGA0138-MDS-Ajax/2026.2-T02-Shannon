from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, SmallInteger
from sqlmodel import DateTime, Field, Relationship, SQLModel, func

if TYPE_CHECKING:
  from app.habits.models import Habit


GOAL_RULES_CHECK = (
  "(period = 'day' AND target_count = 1 AND period_end_weekday IS NULL) OR "
  "(period = 'week' AND target_count BETWEEN 1 AND 7"
  " AND period_end_weekday IS NOT NULL AND period_end_weekday BETWEEN 1 AND 7) OR "
  "(period = 'month' AND target_count BETWEEN 1 AND 28"
  " AND period_end_weekday IS NULL)"
)


class GoalPeriod(StrEnum):
  DAY = "day"
  WEEK = "week"
  MONTH = "month"


class ScheduleType(StrEnum):
  FREQUENCY = "frequency"


class Goal(SQLModel, table=True):
  """Metas."""

  __tablename__ = "goals"
  __table_args__ = CheckConstraint(GOAL_RULES_CHECK, name="ck_goals_rules")

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  habit_id: UUID = Field(
    foreign_key="habits.id", unique=True, ondelete="CASCADE", nullable=False
  )
  schedule_type: str = Field(
    default=ScheduleType.FREQUENCY, nullable=False, max_length=20
  )
  period: str = Field(nullable=False, max_length=10)
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

  habit: "Habit" = Relationship(back_populates="goal")
