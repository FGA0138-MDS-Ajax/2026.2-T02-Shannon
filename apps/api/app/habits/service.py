from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlmodel import Session

from app.auth.models import User
from app.habits import repository as habits_repository
from app.habits.exceptions import (
  HabitAlreadyFinishedError,
  HabitForbiddenError,
  HabitNotFoundError,
)
from app.habits.models import Habit, HabitStatus
from app.habits.repository import get_habit_by_id, list_check_in_eligible_habits
from app.habits.schemas import HabitCreate

APP_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def today() -> date:
  """Data de hoje no fuso da aplicação, para as colunas DATE.

  Usada em `habits.created_at` (HAB-2) e `habits.finished_at` (HAB-3). Calcular
  em UTC daria o dia seguinte para hábitos criados em Brasília depois das 21h.
  """
  return datetime.now(APP_TIMEZONE).date()


def can_view_habit(habit: Habit, user: User) -> bool:
  """Diz se o usuário pode ver o hábito: é o autor ou o hábito é público.

  Não consulta o banco.
  """
  return habit.author_user_id == user.id or habit.is_public


def get_visible_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Devolve o hábito se o usuário for o autor ou se ele for público.

  Levanta `HabitNotFoundError` se não existir ou se for privado de outra pessoa.
  """
  habit = get_habit_by_id(db, habit_id)

  if habit is None or not can_view_habit(habit, user):
    raise HabitNotFoundError

  return habit


def get_owned_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Devolve o hábito só se o usuário for o autor.

  Levanta `HabitNotFoundError` nos mesmos casos de `get_visible_habit` e
  `HabitForbiddenError` se o usuário vê o hábito, mas não é o autor.
  """
  habit = get_visible_habit(db, habit_id, user)

  if habit.author_user_id != user.id:
    raise HabitForbiddenError

  return habit


def get_check_in_eligible_habits(db: Session, user: User) -> list[Habit]:
  """Hábitos em que o usuário pode fazer check-in: os dele que estão ativos."""
  return list_check_in_eligible_habits(db, user.id)


def create_habit(db: Session, user: User, data: HabitCreate) -> Habit:
  """Cria um novo hábito associado ao usuário logado, persiste e atualiza no banco."""
  habit = Habit(
    **data.model_dump(),
    author_user_id=user.id,
    created_at=today(),
  )

  habits_repository.create_habit(db, habit)
  db.commit()
  db.refresh(habit)

  return habit


def list_my_habits(
  db: Session, user: User, status: HabitStatus | None = None
) -> list[Habit]:
  """Lista os hábitos pertencentes ao usuário logado, com filtro opcional de status."""
  return habits_repository.list_habits_by_author(db, user_id=user.id, status=status)


def finish_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Encerra o hábito do autor com `finished_at` = hoje.

  Checa o acesso antes (404/403) e só depois se já está encerrado
  (`HabitAlreadyFinishedError`).
  """
  habit = get_owned_habit(db, habit_id, user)

  if habit.status == HabitStatus.FINISHED:
    raise HabitAlreadyFinishedError

  habits_repository.finish_habit(db, habit, today())
  db.commit()
  db.refresh(habit)

  return habit


def delete_habit(db: Session, habit_id: UUID, user: User) -> None:
  """Exclui o hábito do autor. Os check-ins continuam; só os vínculos somem."""
  habit = get_owned_habit(db, habit_id, user)

  habits_repository.delete_habit(db, habit)
  db.commit()
