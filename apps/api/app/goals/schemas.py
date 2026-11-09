from datetime import date
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.goals.exceptions import (
  MSG_GOAL_DAY_TARGET,
  MSG_GOAL_MONTH_TARGET,
  MSG_GOAL_WEEK_TARGET,
  MSG_GOAL_WEEKDAY_NOT_ALLOWED,
  MSG_GOAL_WEEKDAY_REQUIRED,
)
from app.goals.models import GoalPeriod, ScheduleType
from app.goals.streak import GoalProgress


class GoalInput(BaseModel):
  """Corpo da meta no `POST /habits` e no `PUT /habits/{id}/goal`.

  Não importa nada de `app/habits/` nem de `app/checkins/`, para evitar import
  circular. As regras por período estão em `check_period_rules`.
  """

  model_config = ConfigDict(from_attributes=True)

  period: GoalPeriod
  target_count: int | None = Field(default=None, ge=1, le=28)
  period_end_weekday: int | None = Field(default=None, ge=1, le=7)

  @model_validator(mode="after")
  def check_period_rules(self) -> Self:
    """Valida `target_count` e `period_end_weekday` conforme o período.

    Na meta diária, grava `target_count = 1` quando vier vazio.
    """
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
  """Meta devolvida pela API. `id`, `habit_id` e datas do banco ficam de fora."""

  model_config = ConfigDict(from_attributes=True)

  schedule_type: ScheduleType
  period: GoalPeriod
  target_count: int
  period_end_weekday: int | None
  starts_on: date


class HabitProgressPublic(GoalProgress):
  """Acompanhamento do hábito: a meta e o progresso calculado na hora."""

  habit_id: UUID
  goal: GoalPublic
