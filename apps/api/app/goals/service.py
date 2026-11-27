from datetime import date
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.checkins.schemas import GroupSummary
from app.goals import repository as goals_repository
from app.goals.exceptions import (
  GoalHabitFinishedError,
  GoalNotFoundError,
  GroupHabitGoalLockedError,
)
from app.goals.models import Goal
from app.goals.schemas import GoalInput, HabitProgressPublic
from app.goals.streak import calculate_progress
from app.group.models import Group
from app.group.repository import get_member, list_groups_by_ids
from app.group.status import group_reference_date
from app.habits import service as habits_service
from app.habits.exceptions import HabitNotFoundError
from app.habits.models import Habit, HabitStatus
from app.habits.repository import get_habit_by_id
from app.habits.schemas import HabitWithProgress


def set_goal(db: Session, habit_id: UUID, user: User, data: GoalInput) -> Goal:
  """Cria ou troca a meta de um hábito do autor.

  Cria a meta dos hábitos antigos, que não têm uma. Se a regra mudar, reinicia o
  streak com `starts_on` = hoje. A mesma regra enviada de novo não grava nada.
  Checa o acesso (404/403) antes do hábito encerrado (`GoalHabitFinishedError`).

  A meta de hábito de grupo é compartilhada e não pode mudar, porque reiniciaria o
  streak de todos os membros: membro do grupo recebe `GroupHabitGoalLockedError`
  (409); quem não é membro recebe `HabitNotFoundError` (404), sem saber que o
  hábito existe.
  """
  group_habit = get_habit_by_id(db, habit_id)
  if group_habit is not None and group_habit.author_group_id is not None:
    if get_member(db, group_habit.author_group_id, user.id) is None:
      raise HabitNotFoundError
    raise GroupHabitGoalLockedError

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


def build_habits_progress(
  habits: list[Habit], days: dict[UUID, set[date]], today: date
) -> dict[UUID, HabitProgressPublic]:
  """Calcula o progresso com os dias já buscados. Não consulta o banco.

  Usado por quem já tem os dias em mãos, como as estatísticas (STAT-4). Hábitos
  sem meta ficam de fora do resultado.
  """
  result: dict[UUID, HabitProgressPublic] = {}
  for habit in habits:
    if habit.goal is None:
      continue
    progress = calculate_progress(
      habit.goal, days.get(habit.id, set()), today, habit.finished_at
    )
    result[habit.id] = HabitProgressPublic(
      habit_id=habit.id, goal=habit.goal, **progress.model_dump()
    )
  return result


def calculate_habits_progress(
  db: Session,
  habits: list[Habit],
  user: User | None = None,
  groups_by_id: dict[UUID, Group] | None = None,
) -> dict[UUID, HabitProgressPublic]:
  """Calcula o progresso de vários hábitos, em lote.

  Usado no acompanhamento de um hábito (GOAL-5) e nas listas (GOAL-6 e GOAL-7).
  Hábitos sem meta ficam de fora do resultado. Nada é gravado.

  Hábitos pessoais: uma consulta aos check-ins do autor. Hábitos de grupo: exigem
  `user` (sem ele, `ValueError`); o progresso é o dele, contado desde a entrada
  no grupo e até a data de referência do hábito (uma consulta aos grupos e outra
  aos check-ins).

  `groups_by_id` evita a consulta aos grupos quando quem chama já os tem. Se vier
  e faltar o grupo de um hábito, levanta `KeyError`.
  """
  with_goal = [habit for habit in habits if habit.goal is not None]
  personal = [habit for habit in with_goal if habit.author_group_id is None]
  group_habits = [habit for habit in with_goal if habit.author_group_id is not None]
  if group_habits and user is None:
    raise ValueError("Hábitos de grupo exigem `user` para calcular o progresso.")
  today = habits_service.today()

  days = goals_repository.list_check_in_days(db, [habit.id for habit in personal])
  result = build_habits_progress(personal, days, today)

  if group_habits and user is not None:
    result.update(
      _calculate_group_habits_progress(db, group_habits, user, today, groups_by_id)
    )

  return result


def _calculate_group_habits_progress(
  db: Session,
  habits: list[Habit],
  user: User,
  today: date,
  groups_by_id: dict[UUID, Group] | None,
) -> dict[UUID, HabitProgressPublic]:
  """Progresso do usuário em hábitos de grupo com meta. Não faz commit."""
  fetched = groups_by_id is None
  groups = groups_by_id
  if groups is None:
    groups = {
      group.id: group
      for group in list_groups_by_ids(
        db, {habit.author_group_id for habit in habits if habit.author_group_id}
      )
    }
  days = goals_repository.list_check_in_days_by_member(
    db, [habit.id for habit in habits], [user.id]
  )

  result: dict[UUID, HabitProgressPublic] = {}
  for habit in habits:
    if habit.author_group_id is None or habit.goal is None:
      continue
    group = (
      groups.get(habit.author_group_id) if fetched else groups[habit.author_group_id]
    )
    if group is None:
      continue
    progress = calculate_progress(
      habit.goal,
      days.get((habit.id, user.id), set()),
      today,
      group_reference_date(group, habit, today),
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

  return calculate_habits_progress(db, [habit], user)[habit.id]


def _group_summary(group: Group) -> GroupSummary:
  return GroupSummary(id=group.id, name=group.name)


def list_habits_with_progress(
  db: Session, user: User, status: HabitStatus | None = None
) -> list[HabitWithProgress]:
  """Lista os hábitos do usuário logado, pessoais e dos grupos dele, com progresso.

  Calcula o progresso de todos os hábitos em lote, com número de consultas fixo
  (não depende de quantos grupos o usuário tem). Hábito sem meta recebe
  `progress: None`; hábito de grupo recebe `group` preenchido e o progresso do
  próprio usuário. Mantém o filtro de status e a ordenação original.
  """
  habits = habits_service.list_my_habits_with_groups(db, user, status)
  groups = {
    group.id: group
    for group in list_groups_by_ids(
      db, {habit.author_group_id for habit in habits if habit.author_group_id}
    )
  }
  progress = calculate_habits_progress(db, habits, user, groups)

  return [
    HabitWithProgress.model_validate(habit, from_attributes=True).model_copy(
      update={
        "progress": progress.get(habit.id),
        "group": _group_summary(groups[habit.author_group_id])
        if habit.author_group_id
        else None,
      }
    )
    for habit in habits
  ]
