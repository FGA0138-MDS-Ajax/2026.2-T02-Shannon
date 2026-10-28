from sqlmodel import Session

from app.goals.models import Goal


def save_goal(db: Session, goal: Goal) -> Goal:
  """Adiciona a meta nova ou a alterada e faz flush. Não faz commit."""
  db.add(goal)
  db.flush()
  return goal
