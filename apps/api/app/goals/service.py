from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.goals.exceptions import GoalHabitFinishedError
from app.goals.models import Goal
from app.goals.schemas import GoalInput
from app.habits import service as habits_service
from app.habits.models import HabitStatus


def set_goal(db: Session, habit_id: UUID, user: User, data: GoalInput) -> Goal:
  """Cria ou troca a meta de um hábito do autor.

  Cria a meta dos hábitos antigos, que não têm uma. Se a regra mudar, reinicia o
  streak com `starts_on` = hoje. A mesma regra enviada de novo não grava nada.
  Checa o acesso (404/403) antes do hábito encerrado (`GoalHabitFinishedError`).
  """
  habit = habits_service.get_owned_habit(db, habit_id, user)

  if habit.status == HabitStatus.FINISHED:
    raise GoalHabitFinishedError

  rule = data.model_dump()
  goal = habit.goal

  if goal is None:
    goal = Goal(habit_id=habit.id, starts_on=habits_service.today(), **rule)
  elif any(getattr(goal, field) != value for field, value in rule.items()):
    goal.sqlmodel_update(rule)
    goal.starts_on = habits_service.today()
  else:
    return goal

  goals_repository.save_goal(db, goal)
  db.commit()
  db.refresh(goal)

  return goal
