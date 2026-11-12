"""Módulo temporário que agrupa regras de negócio (service) e rotas
(router) de integrantes de grupos.

Refatoração pós-sprint:
- Funções `service_*` e helpers puros migrarão para `app/group/service.py`.
- Handlers de endpoint (`post_*`, `get_*`, `delete_*`) e `register_routes`
  migrarão para `app/group/router.py`.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth import repository as auth_repository
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.group import repository
from app.group.exceptions import (
  MSG_ALREADY_ADMIN,
  MSG_ALREADY_MEMBER,
  MSG_CANNOT_REMOVE_SELF,
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_FULL,
  MSG_GROUP_NOT_FOUND,
  MSG_MEMBER_NOT_FOUND,
  MSG_USER_TO_ADD_NOT_FOUND,
  AlreadyAdminError,
  AlreadyMemberError,
  CannotRemoveSelfError,
  GroupEndedError,
  GroupForbiddenError,
  GroupFullError,
  GroupNotFoundError,
  MemberNotFoundError,
  UserToAddNotFoundError,
)
from app.group.models import GROUP_MAX_MEMBERS, GroupRole, Member
from app.group.permissions import require_admin, require_member
from app.group.responses import (
  RESPONSES_ADD_MEMBER,
  RESPONSES_DELETE_MEMBER,
  RESPONSES_LEAVE_GROUP,
  RESPONSES_LIST_MEMBERS,
  RESPONSES_PROMOTE_MEMBER,
)
from app.group.schemas import LeaveResult, MemberAdd, MemberPublic
from app.group.status import group_status
from app.habits import service as habits_service


def choose_successor(members: list[Member], leaving_user_id: UUID) -> Member | None:
  """Função pura que escolhe o sucessor entre os membros restantes.

  Ordena por joined_at mais antigo e desempata por user_id crescente.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  candidates = [m for m in members if m.user_id != leaving_user_id]
  if not candidates:
    return None

  candidates.sort(
    key=lambda m: (
      m.joined_at.timestamp() if m.joined_at else 0.0,
      m.user_id,
    )
  )
  return candidates[0]


def service_add_member(
  db: Session, group_id: UUID, user: User, data: MemberAdd
) -> MemberPublic:
  """Adiciona um membro por username após validação com lock no grupo.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  require_admin(db, group_id, user)
  group = repository.get_group_for_update(db, group_id)
  if group is None:
    raise GroupNotFoundError

  target_user = auth_repository.get_user_by_username(db, data.username)
  if target_user is None:
    raise UserToAddNotFoundError

  today = habits_service.today()
  if group_status(group, today) == "ended":
    raise GroupEndedError

  existing_member = repository.get_member(db, group_id, target_user.id)
  if existing_member is not None:
    raise AlreadyMemberError

  current_count = repository.count_members(db, group_id)
  if current_count >= GROUP_MAX_MEMBERS:
    raise GroupFullError

  new_member = Member(
    group_id=group_id,
    user_id=target_user.id,
    role=GroupRole.MEMBER.value,
  )
  repository.add_member(db, new_member)
  db.commit()
  db.refresh(new_member)

  return MemberPublic(
    user_id=target_user.id,
    username=target_user.username,
    role=GroupRole.MEMBER,
    joined_at=new_member.joined_at,
  )


def service_list_members(db: Session, group_id: UUID, user: User) -> list[MemberPublic]:
  """Lista todos os integrantes do grupo.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  require_member(db, group_id, user)
  members_with_users = repository.list_members_with_users(db, group_id)

  return [
    MemberPublic(
      user_id=u.id,
      username=u.username,
      role=GroupRole(m.role),
      joined_at=m.joined_at,
    )
    for m, u in members_with_users
  ]


def service_remove_member(
  db: Session, group_id: UUID, target_user_id: UUID, user: User
) -> None:
  """Remove um integrante do grupo.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  require_admin(db, group_id, user)
  group = repository.get_group_for_update(db, group_id)
  if group is None:
    raise GroupNotFoundError

  if target_user_id == user.id:
    raise CannotRemoveSelfError

  target_member = repository.get_member(db, group_id, target_user_id)
  if target_member is None:
    raise MemberNotFoundError

  repository.remove_member(db, target_member)
  db.commit()


def service_promote_member(
  db: Session, group_id: UUID, target_user_id: UUID, user: User
) -> MemberPublic:
  """Promove um membro a administrador.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  require_admin(db, group_id, user)
  group = repository.get_group_for_update(db, group_id)
  if group is None:
    raise GroupNotFoundError

  target_member = repository.get_member(db, group_id, target_user_id)
  if target_member is None:
    raise MemberNotFoundError

  if target_member.role == GroupRole.ADMIN.value:
    raise AlreadyAdminError

  repository.set_member_role(db, target_member, GroupRole.ADMIN)
  target_user = auth_repository.get_user_by_id(db, target_user_id)
  db.commit()
  db.refresh(target_member)

  return MemberPublic(
    user_id=target_member.user_id,
    username=target_user.username if target_user else "",
    role=GroupRole.ADMIN,
    joined_at=target_member.joined_at,
  )


def service_leave_group(db: Session, group_id: UUID, user: User) -> LeaveResult:
  """Processa a saída de um membro, cuidando de sucessão ou exclusão do grupo.

  [Refatoração pós-sprint]: Destino -> app/group/service.py
  """
  _, member = require_member(db, group_id, user)
  group = repository.get_group_for_update(db, group_id)
  if group is None:
    raise GroupNotFoundError

  all_members = repository.list_members(db, group_id)
  remaining_members = [m for m in all_members if m.user_id != user.id]

  # Caso 1: Saiu o último integrante -> apaga o grupo
  if not remaining_members:
    repository.remove_member(db, member)
    repository.delete_group(db, group)
    db.commit()
    return LeaveResult(group_deleted=True, promoted_user_id=None)

  # Caso 2: Membro comum sai, ou admin sai havendo outro admin
  is_admin = member.role == GroupRole.ADMIN.value
  admin_count = sum(1 for m in all_members if m.role == GroupRole.ADMIN.value)

  if not is_admin or admin_count > 1:
    repository.remove_member(db, member)
    db.commit()
    return LeaveResult(group_deleted=False, promoted_user_id=None)

  # Caso 3: Era o único admin e restam outros membros -> promove sucessor
  successor = choose_successor(all_members, user.id)
  if successor is not None:
    repository.set_member_role(db, successor, GroupRole.ADMIN)

  repository.remove_member(db, member)
  db.commit()
  return LeaveResult(
    group_deleted=False,
    promoted_user_id=successor.user_id if successor else None,
  )


# --- Endpoints ---


def post_member(
  db: SessionDep,
  group_id: UUID,
  data: MemberAdd,
  user: Annotated[User, Depends(get_current_user)],
) -> MemberPublic:
  """Adiciona um novo integrante ao grupo por username (apenas admin).

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  try:
    return service_add_member(db, group_id, user, data)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except UserToAddNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_USER_TO_ADD_NOT_FOUND) from None
  except GroupEndedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_ENDED) from None
  except AlreadyMemberError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_ALREADY_MEMBER) from None
  except GroupFullError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GROUP_FULL) from None


def get_members(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> list[MemberPublic]:
  """Lista todos os integrantes do grupo.

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  try:
    return service_list_members(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None


def delete_member(
  db: SessionDep,
  group_id: UUID,
  user_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> None:
  """Remove um integrante do grupo (apenas admin).

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  try:
    service_remove_member(db, group_id, user_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except MemberNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_MEMBER_NOT_FOUND) from None
  except CannotRemoveSelfError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_CANNOT_REMOVE_SELF) from None


def post_promote(
  db: SessionDep,
  group_id: UUID,
  user_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> MemberPublic:
  """Promove um integrante do grupo a administrador (apenas admin).

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  try:
    return service_promote_member(db, group_id, user_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except GroupForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_GROUP_FORBIDDEN) from None
  except MemberNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_MEMBER_NOT_FOUND) from None
  except AlreadyAdminError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_ALREADY_ADMIN) from None


def post_leave(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> LeaveResult:
  """Sai do grupo (com sucessão automática se admin ou auto-exclusão do grupo).

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  try:
    return service_leave_group(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None


def register_routes(router: APIRouter) -> None:
  """Registra as rotas de integrantes no router `/groups`.

  [Refatoração pós-sprint]: Destino -> app/group/router.py
  """
  router.post(
    "/{group_id}/members",
    response_model=MemberPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar integrante",
    description="Adiciona um novo integrante ao grupo por username (apenas admin).",
    responses=RESPONSES_ADD_MEMBER,
  )(post_member)

  router.get(
    "/{group_id}/members",
    response_model=list[MemberPublic],
    status_code=status.HTTP_200_OK,
    summary="Listar integrantes",
    description="Lista todos os integrantes do grupo.",
    responses=RESPONSES_LIST_MEMBERS,
  )(get_members)

  router.delete(
    "/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remover integrante",
    description="Remove um integrante do grupo (apenas admin).",
    responses=RESPONSES_DELETE_MEMBER,
  )(delete_member)

  router.post(
    "/{group_id}/members/{user_id}/promote",
    response_model=MemberPublic,
    status_code=status.HTTP_200_OK,
    summary="Promover a administrador",
    description="Promove um integrante do grupo a administrador (apenas admin).",
    responses=RESPONSES_PROMOTE_MEMBER,
  )(post_promote)

  router.post(
    "/{group_id}/leave",
    response_model=LeaveResult,
    status_code=status.HTTP_200_OK,
    summary="Sair do grupo",
    description=(
      "Sai do grupo. Se for o último admin, transfere o papel. Se for o último"
      " integrante, exclui o grupo."
    ),
    responses=RESPONSES_LEAVE_GROUP,
  )(post_leave)
