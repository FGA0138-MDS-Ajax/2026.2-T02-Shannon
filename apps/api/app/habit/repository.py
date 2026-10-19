from uuid import UUID

from sqlmodel import Session

from app.habit.models import Habit


def get_habit_by_id(db: Session, habit_id: UUID) -> Habit | None:

  return db.get(Habit, habit_id)
