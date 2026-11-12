from collections import defaultdict
from datetime import date
from uuid import UUID

from sqlalchemy import Date, func
from sqlmodel import Session, col, select

from app.checkins.models import CheckIn, CheckInHabit
from app.goals.models import Goal
from app.group.models import Member
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


def list_check_in_days_by_member(
  db: Session, habit_ids: list[UUID], user_ids: list[UUID]
) -> dict[tuple[UUID, UUID], set[date]]:
  """Dias distintos (São Paulo) com check-in, por `(habit_id, user_id)`. Sem commit.

  Uma consulta para qualquer quantidade de hábitos e membros. Não filtra pelo autor
  do hábito: junta com `group_members` e só conta a partir do maior entre o
  `starts_on` da meta e o dia (São Paulo) da entrada no grupo. Quem saiu do grupo
  não aparece. Par sem check-in também não: use `days.get((habit_id, user_id),
  set())`.
  """
  if not habit_ids or not user_ids:
    return {}

  local_day = func.date(
    func.timezone(APP_TIMEZONE_NAME, col(CheckIn.created_at)), type_=Date
  )
  joined_day = func.date(
    func.timezone(APP_TIMEZONE_NAME, col(Member.joined_at)), type_=Date
  )
  statement = (
    select(col(CheckInHabit.habit_id), col(CheckIn.user_id), local_day)
    .distinct()
    .join(CheckIn, col(CheckIn.id) == col(CheckInHabit.check_in_id))
    .join(Habit, col(Habit.id) == col(CheckInHabit.habit_id))
    .join(Goal, col(Goal.habit_id) == col(CheckInHabit.habit_id))
    .join(
      Member,
      (col(Member.group_id) == col(Habit.author_group_id))
      & (col(Member.user_id) == col(CheckIn.user_id)),
    )
    .where(
      col(CheckInHabit.habit_id).in_(habit_ids),
      col(CheckIn.user_id).in_(user_ids),
      local_day >= func.greatest(col(Goal.starts_on), joined_day),
    )
  )

  days: dict[tuple[UUID, UUID], set[date]] = defaultdict(set)
  for habit_id, user_id, day in db.exec(statement).all():
    days[(habit_id, user_id)].add(day)
  return days
