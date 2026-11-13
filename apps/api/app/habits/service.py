from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlmodel import Session

from app.auth.models import User
from app.checkins.schemas import GroupSummary
from app.goals.models import Goal
from app.group import repository as group_repository
from app.habits import repository as habits_repository
from app.habits.exceptions import (
  GroupHabitForbiddenError,
  HabitAlreadyFinishedError,
  HabitForbiddenError,
  HabitNotFoundError,
  TargetEndDateBeforeCreatedError,
)
from app.habits.models import Habit, HabitStatus
from app.habits.repository import get_habit_by_id, list_check_in_eligible_habits
from app.habits.schemas import HabitCreate, HabitPublic, HabitUpdate

APP_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def today() -> date:
  """Data de hoje no fuso da aplicação, para as colunas DATE.

  Usada em `habits.created_at` (HAB-2) e `habits.finished_at` (HAB-3). Calcular
  em UTC daria o dia seguinte para hábitos criados em Brasília depois das 21h.
  """
  return datetime.now(APP_TIMEZONE).date()


def can_view_habit(
  habit: Habit, user: User, group_ids: frozenset[UUID] = frozenset()
) -> bool:
  """Diz se o usuário pode ver o hábito.

  Hábito pessoal: o usuário é o autor ou o hábito é público.
  Hábito de grupo: o grupo do hábito está em `group_ids`, o conjunto de grupos de
  que o usuário é membro (quem chama calcula; o padrão vazio preserva o
  comportamento anterior, em que hábito de grupo nunca é visível).
  """
  if habit.author_group_id is not None:
    return habit.author_group_id in group_ids

  return habit.author_user_id == user.id or habit.is_public


def get_visible_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Devolve o hábito se o usuário puder vê-lo.

  Hábito pessoal: o usuário é o autor ou o hábito é público. Hábito de grupo: o
  usuário é membro do grupo (só nesse caso consulta a participação no banco).

  Levanta `HabitNotFoundError` se não existir, se for privado de outra pessoa ou
  se for de um grupo de que o usuário não participa.
  """
  habit = get_habit_by_id(db, habit_id)

  if habit is None:
    raise HabitNotFoundError

  group_ids: frozenset[UUID] = frozenset()
  if habit.author_group_id is not None:
    group_ids = frozenset(group_repository.list_group_ids_of_user(db, user.id))

  if not can_view_habit(habit, user, group_ids):
    raise HabitNotFoundError

  return habit


def get_visible_habit_public(db: Session, habit_id: UUID, user: User) -> HabitPublic:
  """Devolve o hábito visível já no formato da resposta, com o `group` preenchido.

  Hábito pessoal não faz consulta extra e vem com `group: None`. Hábito de grupo
  faz uma consulta a mais, para buscar o grupo. Mesmas exceções de
  `get_visible_habit`.
  """
  habit = get_visible_habit(db, habit_id, user)
  public = HabitPublic.model_validate(habit)

  if habit.author_group_id is None:
    return public

  group = group_repository.get_group(db, habit.author_group_id)
  if group is None:
    raise HabitNotFoundError

  return public.model_copy(update={"group": GroupSummary(id=group.id, name=group.name)})


def get_owned_habit(db: Session, habit_id: UUID, user: User) -> Habit:
  """Devolve o hábito só se o usuário for o autor.

  Levanta `HabitNotFoundError` nos mesmos casos de `get_visible_habit` e
  `HabitForbiddenError` se o usuário vê o hábito, mas não é o autor. Hábito de
  grupo nunca tem "dono" pessoal: o membro que o vê recebe sempre
  `GroupHabitForbiddenError` (subclasse de `HabitForbiddenError`), pois ele só é
  alterado pelas rotas do grupo.
  """
  habit = get_visible_habit(db, habit_id, user)

  if habit.author_group_id is not None:
    raise GroupHabitForbiddenError

  if habit.author_user_id != user.id:
    raise HabitForbiddenError

  return habit


def get_check_in_eligible_habits(db: Session, user: User) -> list[Habit]:
  """Hábitos em que o usuário pode fazer check-in.

  Os dele que estão ativos e os ativos dos grupos ativos de que ele é membro.
  """
  return list_check_in_eligible_habits(db, user.id, today())


def create_habit(db: Session, user: User, data: HabitCreate) -> Habit:
  """Cria um novo hábito com a sua meta, na mesma transação."""
  habit = Habit(
    **data.model_dump(exclude={"goal"}),
    author_user_id=user.id,
    created_at=today(),
  )

  habits_repository.create_habit(db, habit)
  db.add(Goal(habit_id=habit.id, starts_on=habit.created_at, **data.goal.model_dump()))
  db.commit()
  db.refresh(habit)

  return habit


def list_my_habits(
  db: Session, user: User, status: HabitStatus | None = None
) -> list[Habit]:
  """Lista os hábitos pertencentes ao usuário logado, com filtro opcional de status."""
  return habits_repository.list_habits_by_author(db, user_id=user.id, status=status)


def list_my_habits_with_groups(
  db: Session, user: User, status: HabitStatus | None = None
) -> list[Habit]:
  """Lista os hábitos do usuário e os dos grupos de que ele é membro.

  Alimenta a lista pessoal (`GET /habits`). Não substitui `list_my_habits`, que
  continua só com hábitos pessoais para as estatísticas.
  """
  return habits_repository.list_habits_for_user_with_groups(
    db, user_id=user.id, status=status
  )


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


def update_habit(db: Session, habit_id: UUID, user: User, data: HabitUpdate) -> Habit:
  """Edita só os campos enviados de um hábito do autor.

  Levanta `TargetEndDateBeforeCreatedError` se `target_end_date` vier antes do
  `created_at` gravado; por depender do banco, essa regra fica aqui, não no schema.
  """
  habit = get_owned_habit(db, habit_id, user)
  changes = data.model_dump(exclude_unset=True)

  target_end_date = changes.get("target_end_date")
  if target_end_date is not None and target_end_date < habit.created_at:
    raise TargetEndDateBeforeCreatedError

  habits_repository.update_habit(db, habit, changes)
  db.commit()
  db.refresh(habit)

  return habit
