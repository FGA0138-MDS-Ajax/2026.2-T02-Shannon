from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.goals.exceptions import GoalHabitFinishedError, GoalNotFoundError
from app.goals.models import Goal
from app.goals.schemas import GoalInput, HabitProgressPublic
from app.goals.streak import calculate_progress
from app.habits import service as habits_service
from app.habits.models import Habit, HabitStatus
from app.habits.schemas import HabitWithProgress


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


def calculate_habits_progress(
  db: Session, habits: list[Habit]
) -> dict[UUID, HabitProgressPublic]:
  """Calcula o progresso de vários hábitos com uma consulta só aos check-ins.

  Usado no acompanhamento de um hábito (GOAL-5) e nas listas (GOAL-6 e GOAL-7).
  Hábitos sem meta ficam de fora do resultado. Nada é gravado.
  """
  with_goal = [habit for habit in habits if habit.goal is not None]
  days = goals_repository.list_check_in_days(db, [habit.id for habit in with_goal])
  today = habits_service.today()

  result: dict[UUID, HabitProgressPublic] = {}
  for habit in with_goal:
    progress = calculate_progress(
      habit.goal, days.get(habit.id, set()), today, habit.finished_at
    )
    result[habit.id] = HabitProgressPublic(
      habit_id=habit.id, goal=habit.goal, **progress.model_dump()
    )
  return result


def get_habit_progress(db: Session, habit_id: UUID, user: User) -> HabitProgressPublic:
  """Progresso da meta de um hábito que o usuário pode ver.

  Levanta `HabitNotFoundError` se o hábito não existir ou for privado de outra
  pessoa, e `GoalNotFoundError` se ele não tiver meta.
  """
  habit = habits_service.get_visible_habit(db, habit_id, user)

  if habit.goal is None:
    raise GoalNotFoundError

  return calculate_habits_progress(db, [habit])[habit.id]


def list_habits_with_progress(
  db: Session, user: User, status: HabitStatus | None = None
) -> list[HabitWithProgress]:
  """Lista os hábitos do usuário logado com o progresso calculado da meta.

  Calcula o progresso de todos os hábitos em lote com uma consulta só aos
  check-ins. Hábito sem meta recebe `progress: None`. Mantém o filtro de status
  e a ordenação original.
  """
  habits = habits_service.list_my_habits(db, user, status)
  progress = calculate_habits_progress(db, habits)

  return [
    HabitWithProgress.model_validate(habit, from_attributes=True).model_copy(
      update={"progress": progress.get(habit.id)}
    )
    for habit in habits
  ]
