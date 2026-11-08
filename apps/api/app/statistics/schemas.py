import re
from datetime import date
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.goals.models import GoalPeriod
from app.goals.schemas import HabitProgressPublic
from app.statistics.exceptions import MSG_CALENDAR_MONTH_INVALID

MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class StatisticsMode(StrEnum):
  CALENDAR = "calendar"
  ROLLING = "rolling"


class HabitsSummary(BaseModel):
  total: int
  active: int
  finished: int


class CheckInsSummary(BaseModel):
  total: int
  today: int
  week: int
  month: int


class CompletedHabitsSummary(BaseModel):
  today: int
  week: int
  month: int


class CompletionRate(BaseModel):
  completed_periods: int
  total_periods: int
  rate: float


class GoalCompletion(CompletionRate):
  days: int


class ActivityStreak(BaseModel):
  current: int
  best: int


class AtRiskSummary(BaseModel):
  count: int
  habit_ids: list[UUID]


class HabitStatisticsItem(HabitProgressPublic):
  name: str
  checked_today: bool
  consistency: CompletionRate


class SeriesPoint(BaseModel):
  date: date
  count: int


class Series(BaseModel):
  start: date
  end: date
  points: list[SeriesPoint]


class UserStatistics(BaseModel):
  reference_date: date
  timezone: str
  mode: StatisticsMode
  habits: HabitsSummary
  check_ins: CheckInsSummary
  completed_habits: CompletedHabitsSummary
  goal_completion: GoalCompletion
  activity_streak: ActivityStreak
  at_risk: AtRiskSummary
  habit_progress: list[HabitStatisticsItem]
  series: Series


class StatisticsQuery(BaseModel):
  mode: StatisticsMode = StatisticsMode.CALENDAR
  days: int = Field(default=30, ge=1, le=365)


class CalendarDayState(StrEnum):
  COMPLETED = "completed"
  PARTIAL = "partial"
  NONE = "none"
  OUTSIDE = "outside"


class CalendarDay(BaseModel):
  date: date
  state: CalendarDayState


class HabitCalendar(BaseModel):
  habit_id: UUID
  month: str
  period: GoalPeriod
  target_count: int
  days: list[CalendarDay]


class CalendarQuery(BaseModel):
  month: str | None = None

  @field_validator("month")
  @classmethod
  def check_month(cls, value: str | None) -> str | None:
    if value is None:
      return None
    if not MONTH_PATTERN.match(value):
      raise ValueError(MSG_CALENDAR_MONTH_INVALID)
    return value
