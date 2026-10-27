from datetime import date

from pydantic import BaseModel, ConfigDict, Field, Self, model_validator

from app.goals.exceptions import (
  MSG_GOAL_DAY_TARGET,
  MSG_GOAL_MONTH_TARGET,
  MSG_GOAL_WEEK_TARGET,
  MSG_GOAL_WEEKDAY_NOT_ALLOWED,
  MSG_GOAL_WEEKDAY_REQUIRED,
)
from app.goals.models import GoalPeriod, ScheduleType


class GoalInput(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  period: GoalPeriod
  target_count: int | None = Field(ge=1, le=28)
  period_end_weekday: int | None = Field(ge=1, le=7)

  @model_validator(mode="after")
  def check_period_rules(self) -> Self:
    if self.period == GoalPeriod.DAY:
      if self.target_count not in (None, 1):
        raise ValueError(MSG_GOAL_DAY_TARGET)
      self.target_count = 1
    elif self.period == GoalPeriod.WEEK:
      if self.target_count is None or self.target_count > 7:
        raise ValueError(MSG_GOAL_WEEK_TARGET)
    if self.period_end_weekday is None:
      raise ValueError(MSG_GOAL_WEEKDAY_REQUIRED)
    elif self.target_count is None:
      raise ValueError(MSG_GOAL_MONTH_TARGET)

    if self.period != GoalPeriod.WEEK and self.period_end_weekday is not None:
      raise ValueError(MSG_GOAL_WEEKDAY_NOT_ALLOWED)
    return self


class GoalPublic(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  schedule_type: ScheduleType
  period: GoalPeriod
  target_count: int
  period_end_weekday: int | None
  starts_on: date
