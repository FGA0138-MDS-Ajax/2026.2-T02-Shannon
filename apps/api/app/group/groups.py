from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.group import repository
from app.group.exceptions import (
  MSG_GROUP_NOT_FOUND,
  GroupNotFoundError,
)
from app.group.invite import generate_invite_code
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.group.permissions import require_member
from app.group.responses import (
  RESPONSES_CREATE_GROUP,
  RESPONSES_GET_GROUP,
  RESPONSES_LIST_GROUPS,
)
from app.group.schemas import (
  MSG_ENDS_ON_BEFORE_STARTS_ON,
  GroupCreate,
  GroupDetail,
  GroupListItem,
  MemberPublic,
)
from app.group.status import group_status
from app.habits import service as habits_service

MSG_ENDS_ON_BEFORE_TODAY = (
  "A data de término deve ser igual ou posterior à data de hoje."
)


def service_create_group(db: Session, user: User, data: GroupCreate) -> GroupDetail:
  """Cria um grupo novo, vincula o criador como admin e devolve os detalhes."""
  today = habits_service.today()
  starts_on = data.starts_on or today

  if data.ends_on is not None:
    if data.ends_on < starts_on:
      raise HTTPException(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        MSG_ENDS_ON_BEFORE_STARTS_ON,
      )
    if data.ends_on < today:
      raise HTTPException(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        MSG_ENDS_ON_BEFORE_TODAY,
      )

  group = None
  for _ in range(5):
    code = generate_invite_code()
    candidate = Group(
      name=data.name,
      description=data.description,
      starts_on=starts_on,
      ends_on=data.ends_on,
      ranking_criterion=data.ranking_criterion,
      invite_code=code,
    )
    try:
      repository.create_group(db, candidate)
      group = candidate
      break
    except IntegrityError:
      db.rollback()

  if group is None:
    raise HTTPException(
      status.HTTP_500_INTERNAL_SERVER_ERROR,
      "Não foi possível gerar um código de convite único. Tente novamente.",
    )

  creator_member = Member(
    group_id=group.id,
    user_id=user.id,
    role=GroupRole.ADMIN,
  )
  repository.add_member(db, creator_member)
  db.commit()
  db.refresh(group)
  db.refresh(creator_member)

  return GroupDetail(
    id=group.id,
    name=group.name,
    description=group.description,
    starts_on=group.starts_on,
    ends_on=group.ends_on,
    ranking_criterion=RankingCriterion(group.ranking_criterion),
    status=group_status(group, today),
    members_count=1,
    my_role=GroupRole.ADMIN,
    invite_code=group.invite_code,
    members=[
      MemberPublic(
        user_id=user.id,
        username=user.username,
        role=GroupRole.ADMIN,
        joined_at=creator_member.joined_at,
      )
    ],
  )


def service_list_my_groups(db: Session, user: User) -> list[GroupListItem]:
  """Lista os grupos em que o usuário participa, com ativos primeiro."""
  pairs = repository.list_groups_of_user(db, user.id)
  if not pairs:
    return []

  group_ids = [group.id for group, _ in pairs]
  counts = repository.count_members_by_group(db, group_ids)
  today = habits_service.today()

  items: list[tuple[int, float, str, GroupListItem]] = []
  for group, member in pairs:
    status_str = group_status(group, today)
    status_order = 0 if status_str == "active" else 1
    timestamp = group.created_at.timestamp() if group.created_at else 0.0

    item = GroupListItem(
      id=group.id,
      name=group.name,
      members_count=counts.get(group.id, 0),
      my_role=GroupRole(member.role),
      status=status_str,
      ends_on=group.ends_on,
      ranking_criterion=RankingCriterion(group.ranking_criterion),
    )
    items.append((status_order, -timestamp, group.name, item))

  items.sort(key=lambda x: (x[0], x[1], x[2]))
  return [x[3] for x in items]


def service_get_group_detail(db: Session, group_id: UUID, user: User) -> GroupDetail:
  """Devolve os detalhes do grupo e seus membros para um participante."""
  group, member = require_member(db, group_id, user)
  members_with_users = repository.list_members_with_users(db, group_id)
  today = habits_service.today()

  invite_code = group.invite_code if member.role == GroupRole.ADMIN else None
  members_public = [
    MemberPublic(
      user_id=u.id,
      username=u.username,
      role=GroupRole(m.role),
      joined_at=m.joined_at,
    )
    for m, u in members_with_users
  ]

  return GroupDetail(
    id=group.id,
    name=group.name,
    description=group.description,
    starts_on=group.starts_on,
    ends_on=group.ends_on,
    ranking_criterion=RankingCriterion(group.ranking_criterion),
    status=group_status(group, today),
    members_count=len(members_public),
    my_role=GroupRole(member.role),
    invite_code=invite_code,
    members=members_public,
  )


def create_group(
  db: SessionDep,
  data: GroupCreate,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
  """Cria um novo grupo com o usuário autenticado como admin."""
  return service_create_group(db, user, data)


def list_my_groups(
  db: SessionDep,
  user: Annotated[User, Depends(get_current_user)],
) -> list[GroupListItem]:
  """Lista os grupos do usuário logado (ativos primeiro)."""
  return service_list_my_groups(db, user)


def get_group(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
  """Obtém os detalhes de um grupo em que o usuário é membro."""
  try:
    return service_get_group_detail(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None


def register_routes(router: APIRouter) -> None:
  """Registra as rotas de criação, listagem e detalhe no router `/groups`."""
  router.post(
    "",
    response_model=GroupDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Criar grupo",
    description=(
      "Cria um novo grupo e torna o usuário criador o primeiro administrador."
    ),
    responses=RESPONSES_CREATE_GROUP,
  )(create_group)
  router.get(
    "",
    response_model=list[GroupListItem],
    status_code=status.HTTP_200_OK,
    summary="Listar grupos",
    description="Lista os grupos em que o usuário autenticado participa.",
    responses=RESPONSES_LIST_GROUPS,
  )(list_my_groups)
  router.get(
    "/{group_id}",
    response_model=GroupDetail,
    status_code=status.HTTP_200_OK,
    summary="Detalhar grupo",
    description=(
      "Devolve os detalhes do grupo para um membro. O código de convite só é"
      " visível para administradores."
    ),
    responses=RESPONSES_GET_GROUP,
  )(get_group)
