from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.group.exceptions import GroupForbiddenError, GroupNotFoundError
from app.group.models import Group, GroupRole, Member
from app.group.repository import get_group, get_member


def require_member(db: Session, group_id: UUID, user: User) -> tuple[Group, Member]:
  """Garante que o grupo existe e que o usuário é membro.

  Retorna 404 (GroupNotFoundError) em ambos os casos para não revelar a
  existência de grupos para não membros.
  """
  group = get_group(db, group_id)
  if group is None:
    raise GroupNotFoundError

  member = get_member(db, group_id, user.id)
  if member is None:
    raise GroupNotFoundError

  return group, member


def require_admin(db: Session, group_id: UUID, user: User) -> tuple[Group, Member]:
  """Garante que o usuário é administrador do grupo.

  Levanta GroupNotFoundError se não for membro e GroupForbiddenError se for
  membro comum.
  """
  group, member = require_member(db, group_id, user)
  if member.role != GroupRole.ADMIN:
    raise GroupForbiddenError

  return group, member