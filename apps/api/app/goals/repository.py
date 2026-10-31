from collections import defaultdict
from datetime import date
from uuid import UUID

from sqlalchemy import Date, func
from sqlmodel import Session, col, select

from app.checkins.models import CheckIn, CheckInHabit
from app.goals.models import Goal
from app.habits.models import Habit

APP_TIMEZONE_NAME = "America/Sao_Paulo"


def save_goal(db: Session, goal: Goal) -> Goal:
  """Adiciona a meta nova ou a alterada e faz flush. Não faz commit."""
  db.add(goal)
  db.flush()
  return goal


def list_check_in_days(db: Session, habit_ids: list[UUID]) -> dict[UUID, set[date]]:
  """Dias distintos (São Paulo) com check-in do autor, por hábito. Não faz commit.

  Uma consulta para qualquer quantidade de hábitos. Converte o `created_at` para o
  fuso de São Paulo antes de cortar a data; senão, um check-in às 23h30 contaria
  no dia seguinte. Só conta a partir do `starts_on` da meta, e hábito sem meta não
  aparece. Hábito sem check-in também não: use `days.get(habit.id, set())`.
  """
  if not habit_ids:
    return {}

  local_day = func.date(
    func.timezone(APP_TIMEZONE_NAME, col(CheckIn.created_at)), type_=Date
  )
  statement = (
    select(col(CheckInHabit.habit_id), local_day)
    .distinct()
    .join(CheckIn, col(CheckIn.id) == col(CheckInHabit.check_in_id))
    .join(Habit, col(Habit.id) == col(CheckInHabit.habit_id))
    .join(Goal, col(Goal.habit_id) == col(CheckInHabit.habit_id))
    .where(
      col(CheckInHabit.habit_id).in_(habit_ids),
      col(CheckIn.user_id) == col(Habit.author_user_id),
      local_day >= col(Goal.starts_on),
    )
  )

  days: dict[UUID, set[date]] = defaultdict(set)
  for habit_id, day in db.exec(statement).all():
    days[habit_id].add(day)
  return days
