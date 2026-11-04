from datetime import date
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.goals.schemas import HabitProgressPublic


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
