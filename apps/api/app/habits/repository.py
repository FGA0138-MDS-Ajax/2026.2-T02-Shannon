from uuid import UUID

from sqlalchemy import ColumnElement, func
from sqlmodel import Session, col, select

from app.habits.models import Habit, HabitCategory, HabitStatus


def get_habit_by_id(db: Session, habit_id: UUID) -> Habit | None:
  """Busca o hábito pelo id. Não faz commit."""
  return db.get(Habit, habit_id)


def check_in_eligible_conditions(user_id: UUID) -> list[ColumnElement[bool]]:
  """Condições do WHERE para hábito elegível a check-in: do usuário e ativo.

  Única definição da regra. Outras consultas usam `.where(*conditions, ...)`.
  """
  return [
    col(Habit.author_user_id) == user_id,
    col(Habit.status) == HabitStatus.ACTIVE,
  ]


def list_check_in_eligible_habits(db: Session, user_id: UUID) -> list[Habit]:
  """Lista os hábitos elegíveis a check-in do usuário. Não faz commit."""
  statement = select(Habit).where(*check_in_eligible_conditions(user_id))
  return list(db.exec(statement).all())


def list_habits_by_ids(db: Session, habit_ids: list[UUID]) -> list[Habit]:
  """Busca vários hábitos numa consulta só, com IN. Não faz commit.

  Ids inexistentes são ignorados. Lista vazia devolve `[]` sem consultar.
  """
  if not habit_ids:
    return []
  statement = select(Habit).where(col(Habit.id).in_(habit_ids))
  return list(db.exec(statement).all())


def list_habits_by_author(
  db: Session, user_id: UUID, status: HabitStatus | None = None
) -> list[Habit]:
  """Lista os hábitos do autor, opcionalmente filtrados por status. Não faz commit.

  Ordena por `created_at` decrescente e, em caso de empate, por `name` crescente.
  """
  statement = select(Habit).where(col(Habit.author_user_id) == user_id)
  if status is not None:
    statement = statement.where(col(Habit.status) == status)

  statement = statement.order_by(col(Habit.created_at).desc(), col(Habit.name))

  return list(db.exec(statement).all())


def create_habit(db: Session, habit: Habit) -> Habit:
  """Adiciona e faz flush do novo hábito no banco. Não faz commit."""
  db.add(habit)
  db.flush()
  return habit


def count_eligible_habits_by_category(
  db: Session, user_id: UUID
) -> list[tuple[str, int]]:
  """Conta hábitos ativos por categoria para o usuário. Não faz commit."""
  statement = (
    select(Habit.category, func.count())
    .where(*check_in_eligible_conditions(user_id))
    .group_by(Habit.category)
  )
  return list(db.exec(statement).all())


def list_eligible_habits_page(
  db: Session,
  user_id: UUID,
  *,
  category: HabitCategory | None = None,
  exclude_category: HabitCategory | None = None,
  limit: int,
  offset: int,
) -> list[Habit]:
  """Lista uma página de hábitos elegíveis, com ordem estável. Não faz commit."""
  statement = select(Habit).where(*check_in_eligible_conditions(user_id))

  if category is not None:
    statement = statement.where(col(Habit.category) == category.value)

  if exclude_category is not None:
    statement = statement.where(col(Habit.category) != exclude_category.value)

  statement = (
    statement.order_by(col(Habit.name), col(Habit.id)).limit(limit).offset(offset)
  )

  return list(db.exec(statement).all())
