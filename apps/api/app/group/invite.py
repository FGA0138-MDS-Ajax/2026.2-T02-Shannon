from __future__ import annotations

import secrets
from typing import TYPE_CHECKING, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.group import repository
from app.group.exceptions import (
  MSG_ALREADY_IN_GROUP,
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_FULL,
  MSG_GROUP_NOT_FOUND,
  MSG_INVITE_CODE_INVALID,
  AlreadyInGroupError,
  AlreadyMemberError,
  GroupEndedError,
  GroupForbiddenError,
  GroupFullError,
  GroupNotFoundError,
  InviteCodeInvalidError,
)
from app.group.permissions import require_admin
from app.group.schemas import JoinRequest
from app.group.status import group_status
from app.habits import service as habits_service

if TYPE_CHECKING:
  from app.group.schemas import GroupDetail, GroupPreview, InviteCodePublic

INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 8
INVITE_CODE_MAX_ATTEMPTS = 5


def generate_invite_code() -> str:
  """Gera um código seguro de 8 caracteres sem caracteres ambíguos."""
  return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))


def normalize_invite_code(raw: str) -> str:
  """Remove espaços e hífens do código e converte letras para maiúsculas."""
  return "".join(raw.split()).replace("-", "").upper()


def service_join_group(
  db: Session,
  user: User,
  data: JoinRequest,
) -> GroupDetail:
  """Adiciona o usuário ao grupo identificado pelo código de convite."""
  from app.group.members import service_create_member

  code = normalize_invite_code(data.code)
  group = repository.get_group_by_invite_code(db, code)

  if group is None:
    raise InviteCodeInvalidError

  group = repository.get_group_for_update(db, group.id)

  if group is None or group.invite_code != code:
    raise InviteCodeInvalidError

  try:
    service_create_member(db, group, user)
  except AlreadyMemberError:
    raise AlreadyInGroupError from None

  group_id = group.id
  db.commit()

  from app.group.groups import service_get_group_detail

  return service_get_group_detail(db, group_id, user)


def service_preview_group(db: Session, code: str) -> GroupPreview:
  """Devolve informações públicas de um grupo pelo código de convite."""
  from app.group.schemas import GroupPreview

  normalized_code = normalize_invite_code(code)
  group = repository.get_group_by_invite_code(db, normalized_code)

  if group is None:
    raise InviteCodeInvalidError

  return GroupPreview(
    id=group.id,
    name=group.name,
    members_count=repository.count_members(db, group.id),
    status=group_status(group, habits_service.today()),
  )


def service_regenerate_invite_code(
  db: Session,
  group_id: UUID,
  user: User,
) -> InviteCodePublic:
  """Gera e persiste um novo código de convite para o grupo."""
  from app.group.schemas import InviteCodePublic

  group = repository.get_group_for_update(db, group_id)
  if group is None:
    raise GroupNotFoundError

  require_admin(db, group_id, user)

  for _ in range(INVITE_CODE_MAX_ATTEMPTS):
    new_code = generate_invite_code()

    if new_code == group.invite_code:
      continue

    try:
      with db.begin_nested():
        repository.set_invite_code(db, group, new_code)
      break
    except IntegrityError:
      continue
  else:
    raise HTTPException(
      status.HTTP_500_INTERNAL_SERVER_ERROR,
      "Não foi possível gerar um código de convite único. Tente novamente.",
    )

  db.commit()
  return InviteCodePublic(invite_code=new_code)


def post_join(
  db: SessionDep,
  data: JoinRequest,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
  """Handler HTTP para entrar em um grupo usando código de convite."""
  try:
    return service_join_group(db, user, data)
  except InviteCodeInvalidError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_INVITE_CODE_INVALID) from None
  except AlreadyInGroupError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_ALREADY_IN_GROUP) from None
  except GroupEndedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_ENDED) from None
  except GroupFullError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_FULL) from None


def get_preview(
  db: SessionDep,
  code: str,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupPreview:
  """Handler HTTP para visualizar os dados básicos de um convite."""
  _ = user

  try:
    return service_preview_group(db, code)
  except InviteCodeInvalidError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_INVITE_CODE_INVALID) from None


def post_regenerate(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> InviteCodePublic:
  """Handler HTTP para renovar o código de convite de um grupo."""
  try:
    return service_regenerate_invite_code(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None


def register_routes(router: APIRouter) -> None:
  """Registra as rotas de convite no router `/groups`."""
  from app.group.responses import (
    RESPONSES_JOIN,
    RESPONSES_PREVIEW,
    RESPONSES_REGENERATE_INVITE,
  )
  from app.group.schemas import GroupDetail, GroupPreview, InviteCodePublic

  router.post(
    "/join",
    response_model=GroupDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Entrar em grupo por código",
    description="Adiciona o usuário ao grupo utilizando um código de convite.",
    responses=RESPONSES_JOIN,
  )(post_join)

  router.get(
    "/invite/{code}",
    response_model=GroupPreview,
    status_code=status.HTTP_200_OK,
    summary="Pré-visualizar grupo por código",
    description="Exibe informações básicas do grupo antes de entrar.",
    responses=RESPONSES_PREVIEW,
  )(get_preview)

  router.post(
    "/{group_id}/invite/regenerate",
    response_model=InviteCodePublic,
    status_code=status.HTTP_200_OK,
    summary="Renovar código de convite",
    description="Gera um novo código de convite (apenas administradores).",
    responses=RESPONSES_REGENERATE_INVITE,
  )(post_regenerate)
