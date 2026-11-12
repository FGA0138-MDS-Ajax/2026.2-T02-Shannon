from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins.schemas import GroupSummary
from app.database import SessionDep
from app.goals import repository as goals_repository
from app.goals.models import Goal
from app.goals.streak import GoalProgress, calculate_progress
from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_NOT_FOUND,
  GroupEndedError,
  GroupForbiddenError,
  GroupNotFoundError,
)
from app.group.models import Group
from app.group.permissions import require_admin, require_member
from app.group.repository import get_group
from app.group.responses import (
  RESPONSES_CREATE_GROUP_HABIT,
  RESPONSES_FINISH_GROUP_HABIT,
  RESPONSES_GET_GROUP_HABIT,
  RESPONSES_LIST_GROUP_HABITS,
  RESPONSES_UPDATE_GROUP_HABIT,
)
from app.group.schemas import GroupHabitCreate, GroupHabitPublic, GroupHabitUpdate
from app.group.status import group_status
from app.habits import repository as habits_repository
from app.habits import service as habits_service
from app.habits.exceptions import (
  MSG_HABIT_ALREADY_FINISHED,
  MSG_HABIT_NOT_FOUND,
  MSG_TARGET_END_DATE_BEFORE_CREATED,
  HabitAlreadyFinishedError,
  HabitNotFoundError,
  TargetEndDateBeforeCreatedError,
)
from app.habits.models import Habit, HabitStatus
from app.habits.schemas import HabitPublic


def group_reference_date(group: Group, habit: Habit, today: date) -> date:
  """Data de referência de cálculo de um hábito de grupo. Pura."""
  limits = [today]
  if habit.finished_at is not None:
    limits.append(habit.finished_at)
  if group.ends_on is not None:
    limits.append(group.ends_on)
  return min(limits)


def build_members_progress(
  db: Session,
  group: Group,
  habits: list[Habit],
  user_ids: list[UUID],
  today: date,
) -> dict[tuple[UUID, UUID], GoalProgress]:
  """Progresso da meta de cada `(hábito, usuário)`. Não faz commit."""
  with_goal = [habit for habit in habits if habit.goal is not None]
  days = goals_repository.list_check_in_days_by_member(
    db, [habit.id for habit in with_goal], user_ids
  )
  group_ended = group.ends_on is not None and group.ends_on < today

  result: dict[tuple[UUID, UUID], GoalProgress] = {}
  for habit in with_goal:
    reference = group_reference_date(group, habit, today)
    frozen = habit.finished_at is not None or group_ended
    for user_id in user_ids:
      result[(habit.id, user_id)] = calculate_progress(
        habit.goal,
        days.get((habit.id, user_id), set()),
        today,
        reference if frozen else None,
      )
  return result


def create_group_habit(
  db: Session, group_id: UUID, user: User, data: GroupHabitCreate
) -> Habit:
  """Cria um hábito de grupo com a sua meta, na mesma transação."""
  group, _ = require_admin(db, group_id, user)

  if group_status(group, habits_service.today()) == "ended":
    raise GroupEndedError

  habit = Habit(
    **data.model_dump(exclude={"goal"}),
    author_group_id=group.id,
    author_user_id=None,
    created_at=habits_service.today(),
  )

  habits_repository.create_habit(db, habit)
  db.add(Goal(habit_id=habit.id, starts_on=habit.created_at, **data.goal.model_dump()))
  db.commit()
  db.refresh(habit)

  return habit


def list_group_habits(
  db: Session, group_id: UUID, user: User, status: HabitStatus | None = None
) -> list[Habit]:
  """Lista os hábitos do grupo para um membro, com filtro opcional de status.

  `require_member` devolve 404 se o grupo não existe ou o usuário não é membro.
  Não exige grupo ativo: membros veem os hábitos também depois do fim do grupo.
  """
  require_member(db, group_id, user)

  return habits_repository.list_habits_by_group(db, group_id, status)


def _get_habit_of_group(db: Session, group_id: UUID, habit_id: UUID) -> Habit:
  """Busca o hábito e confere que ele pertence ao grupo."""
  habit = habits_repository.get_habit_by_id(db, habit_id)
  if habit is None or habit.author_group_id != group_id:
    raise HabitNotFoundError
  return habit


def get_group_habit(db: Session, group_id: UUID, habit_id: UUID, user: User) -> Habit:
  """Detalha um hábito do grupo para um membro."""
  require_member(db, group_id, user)

  return _get_habit_of_group(db, group_id, habit_id)


def update_group_habit(
  db: Session,
  group_id: UUID,
  habit_id: UUID,
  user: User,
  data: GroupHabitUpdate,
) -> Habit:
  """Edita só os campos enviados de um hábito do grupo. Só o admin."""
  group, _ = require_admin(db, group_id, user)
  habit = _get_habit_of_group(db, group_id, habit_id)

  if group_status(group, habits_service.today()) == "ended":
    raise GroupEndedError

  changes = data.model_dump(exclude_unset=True)

  target_end_date = changes.get("target_end_date")
  if target_end_date is not None and target_end_date < habit.created_at:
    raise TargetEndDateBeforeCreatedError

  habits_repository.update_habit(db, habit, changes)
  db.commit()
  db.refresh(habit)

  return habit


def finish_group_habit(
  db: Session, group_id: UUID, habit_id: UUID, user: User
) -> Habit:
  """Encerra um hábito do grupo com `finished_at` = hoje. Só o admin."""
  group, _ = require_admin(db, group_id, user)
  habit = _get_habit_of_group(db, group_id, habit_id)

  today = habits_service.today()
  if group_status(group, today) == "ended":
    raise GroupEndedError

  if habit.status == HabitStatus.FINISHED:
    raise HabitAlreadyFinishedError

  habits_repository.finish_habit(db, habit, today)
  db.commit()
  db.refresh(habit)

  return habit


group_habits_router = APIRouter(prefix="/groups", tags=["groups"])


def _group_summary(db: Session, group_id: UUID) -> GroupSummary:
  """Busca o grupo uma vez para montar as respostas. Não faz commit.

  Só é chamada depois do serviço, que já garantiu que o grupo existe; o
  `GroupNotFoundError` cobre apenas a tipagem (`get_group` pode devolver `None`).
  """
  group = get_group(db, group_id)
  if group is None:
    raise GroupNotFoundError
  return GroupSummary(id=group.id, name=group.name)


def _to_public(habit: Habit, group: GroupSummary) -> GroupHabitPublic:
  """Monta o `GroupHabitPublic`: os dados do hábito mais o resumo do grupo."""
  return GroupHabitPublic(**HabitPublic.model_validate(habit).model_dump(), group=group)


@group_habits_router.post(
  "/{group_id}/habits",
  response_model=GroupHabitPublic,
  status_code=status.HTTP_201_CREATED,
  summary="Criar hábito do grupo",
  description=(
    "Cria um hábito do grupo com a sua meta. Só o **administrador** pode criar."
    " O hábito fica com `author_group_id` preenchido e `author_user_id` nulo, e a"
    " meta começa hoje. O campo `goal` é **obrigatório** e segue as mesmas regras"
    " do hábito pessoal. `is_public` é ignorado. A meta de um hábito de grupo não"
    " pode ser alterada depois. Grupo encerrado não aceita novos hábitos."
  ),
  responses=RESPONSES_CREATE_GROUP_HABIT,
)
def create_group_habit_route(
  db: SessionDep,
  group_id: UUID,
  data: GroupHabitCreate,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupHabitPublic:
  """Cria um hábito do grupo. Só o administrador."""
  try:
    habit = create_group_habit(db, group_id, user, data)
    group = _group_summary(db, group_id)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except GroupEndedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_ENDED) from None

  return _to_public(habit, group)


@group_habits_router.get(
  "/{group_id}/habits",
  response_model=list[GroupHabitPublic],
  status_code=status.HTTP_200_OK,
  summary="Listar hábitos do grupo",
  description=(
    "Lista os hábitos do grupo para qualquer **membro**, ordenados por data de"
    " criação decrescente e nome. Aceita o filtro opcional `status` (`active` ou"
    " `finished`). Continua disponível depois do fim do grupo."
  ),
  responses=RESPONSES_LIST_GROUP_HABITS,
)
def list_group_habits_route(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
  status_filter: Annotated[HabitStatus | None, Query(alias="status")] = None,
) -> list[GroupHabitPublic]:
  """Lista os hábitos do grupo. Qualquer membro."""
  try:
    habits = list_group_habits(db, group_id, user, status_filter)
    group = _group_summary(db, group_id)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None

  return [_to_public(habit, group) for habit in habits]


@group_habits_router.get(
  "/{group_id}/habits/{habit_id}",
  response_model=GroupHabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Consultar hábito do grupo",
  description=(
    "Detalha um hábito do grupo para qualquer **membro**. Hábito inexistente ou"
    " de outro grupo devolve 404."
  ),
  responses=RESPONSES_GET_GROUP_HABIT,
)
def get_group_habit_route(
  db: SessionDep,
  group_id: UUID,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupHabitPublic:
  """Detalha um hábito do grupo. Qualquer membro."""
  try:
    habit = get_group_habit(db, group_id, habit_id, user)
    group = _group_summary(db, group_id)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None

  return _to_public(habit, group)


@group_habits_router.patch(
  "/{group_id}/habits/{habit_id}",
  response_model=GroupHabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Editar hábito do grupo",
  description=(
    "Edita só os campos enviados (`name`, `description`, `category` e"
    " `target_end_date`). Só o **administrador** pode editar. `goal` e"
    " `is_public` no corpo são ignorados: a meta de um hábito de grupo não muda."
    " `description` e `target_end_date` enviados como `null` são apagados. Grupo"
    " encerrado não permite edição."
  ),
  responses=RESPONSES_UPDATE_GROUP_HABIT,
)
def update_group_habit_route(
  db: SessionDep,
  group_id: UUID,
  habit_id: UUID,
  data: GroupHabitUpdate,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupHabitPublic:
  """Edita um hábito do grupo. Só o administrador."""
  try:
    habit = update_group_habit(db, group_id, habit_id, user, data)
    group = _group_summary(db, group_id)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except GroupEndedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_ENDED) from None
  except TargetEndDateBeforeCreatedError:
    raise HTTPException(
      status.HTTP_422_UNPROCESSABLE_ENTITY, MSG_TARGET_END_DATE_BEFORE_CREATED
    ) from None
  return _to_public(habit, group)


@group_habits_router.post(
  "/{group_id}/habits/{habit_id}/finish",
  response_model=GroupHabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Encerrar hábito do grupo",
  description=(
    "Encerra o hábito do grupo com `finished_at` = hoje. Só o **administrador**"
    " pode encerrar. O progresso de todos os membros fica congelado nessa data."
    " Hábito já encerrado, ou grupo encerrado, devolve 409."
  ),
  responses=RESPONSES_FINISH_GROUP_HABIT,
)
def finish_group_habit_route(
  db: SessionDep,
  group_id: UUID,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupHabitPublic:
  """Encerra um hábito do grupo. Só o administrador."""
  try:
    habit = finish_group_habit(db, group_id, habit_id, user)
    group = _group_summary(db, group_id)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except GroupEndedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_ENDED) from None
  except HabitAlreadyFinishedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_HABIT_ALREADY_FINISHED) from None

  return _to_public(habit, group)
