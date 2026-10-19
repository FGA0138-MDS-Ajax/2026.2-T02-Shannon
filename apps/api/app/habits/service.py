from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlmodel import Session

from app.auth.models import User
from app.habits.exceptions import HabitForbiddenError, HabitNotFoundError
from app.habits.models import Habit
from app.habits.repository import get_habit_by_id

APP_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def today() -> date:
  """Data de hoje no fuso da aplicação, para as colunas DATE.

  Usada em `habits.created_at` (HAB-2) e `habits.finished_at` (HAB-3). Calcular
  em UTC daria o dia seguinte para hábitos criados em Brasília depois das 21h.
  """
  return datetime.now(APP_TIMEZONE).date()


def get_visible_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Devolve o hábito se o usuário for o autor ou se ele for público.

  Levanta `HabitNotFoundError` se não existir ou se for privado de outra pessoa.
  """
  habit = get_habit_by_id(db, habit_id)

  if habit is None:
    raise HabitNotFoundError

  if habit.author_user_id != user.id and not habit.is_public:
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
