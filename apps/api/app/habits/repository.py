from uuid import UUID

from sqlmodel import Session

from app.habits.models import Habit


def get_habit_by_id(db: Session, habit_id: UUID) -> Habit | None:
  """Busca o hábito pelo id. Não faz commit."""
  return db.get(Habit, habit_id)
