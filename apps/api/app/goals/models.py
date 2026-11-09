from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, SmallInteger
from sqlmodel import DateTime, Field, Relationship, SQLModel, func

if TYPE_CHECKING:
  from app.habits.models import Habit


# Regra gravada no banco (`ck_goals_period_rules`): cada período aceita só a sua
# combinação de `target_count` e `period_end_weekday`. O `IS NOT NULL` da semanal é
# obrigatório: um CHECK só reprova quando o resultado é `false`, e
# `NULL BETWEEN 1 AND 7` dá `NULL`, então sem ele a linha seria aceita.
GOAL_RULES_CHECK = (
  "(period = 'day' AND target_count = 1 AND period_end_weekday IS NULL) OR "
  "(period = 'week' AND target_count BETWEEN 1 AND 7"
  " AND period_end_weekday IS NOT NULL AND period_end_weekday BETWEEN 1 AND 7) OR "
  "(period = 'month' AND target_count BETWEEN 1 AND 28"
  " AND period_end_weekday IS NULL)"
)


class GoalPeriod(StrEnum):
  """Janela que a meta avalia: um dia, uma semana ou um mês do calendário."""

  DAY = "day"
  WEEK = "week"
  MONTH = "month"


class ScheduleType(StrEnum):
  """Tipo de agenda da meta. Por ora só `frequency` (quantas vezes, não quais dias)."""

  FREQUENCY = "frequency"


class Goal(SQLModel, table=True):
  """Meta de um hábito: quantas vezes cumprir em cada período (1 por hábito).

  `schedule_type` e `period` são VARCHAR, sem ENUM nativo no banco (como a `category`
  do hábito), pois a lista de valores vai crescer e não há Alembic. As regras de
  cada período ficam no `CHECK` `ck_goals_period_rules`. `starts_on` é o dia a
  partir do qual os check-ins contam. A relação `habit` é só do Python: no banco
  existe apenas a FK `habit_id`, apagada junto com o hábito.
  """

  __tablename__ = "goals"
  __table_args__ = (CheckConstraint(GOAL_RULES_CHECK, name="ck_goals_period_rules"),)

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
