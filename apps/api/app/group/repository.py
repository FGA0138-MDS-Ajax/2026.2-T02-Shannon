from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.auth.models import User
from app.group.models import Group, GroupRole, Member


def get_group(db: Session, group_id: UUID) -> Group | None:
  """Busca o grupo pelo id. Não faz commit."""
  return db.get(Group, group_id)


def get_group_for_update(db: Session, group_id: UUID) -> Group | None:
  """Busca o grupo pelo id com lock de linha (FOR UPDATE). Não faz commit."""
  statement = select(Group).where(col(Group.id) == group_id).with_for_update()
  return db.exec(statement).first()


def create_group(db: Session, group: Group) -> Group:
  """Adiciona o grupo e faz flush. Não faz commit."""
  db.add(group)
  db.flush()
  return group


def get_member(db: Session, group_id: UUID, user_id: UUID) -> Member | None:
  """Busca o vínculo de membro pela chave primária composta. Não faz commit."""
  return db.get(Member, (group_id, user_id))


def list_members(db: Session, group_id: UUID) -> list[Member]:
  """Lista membros do grupo ordenados por entrada e user_id. Não faz commit."""
  statement = (
    select(Member)
    .where(col(Member.group_id) == group_id)
    .order_by(col(Member.joined_at), col(Member.user_id))
  )
  return list(db.exec(statement).all())


def list_members_with_users(db: Session, group_id: UUID) -> list[tuple[Member, User]]:
  """Lista membros e usuários do grupo em um join só. Não faz commit."""
  statement = (
    select(Member, User)
    .join(User, col(Member.user_id) == col(User.id))
    .where(col(Member.group_id) == group_id)
    .order_by(col(Member.joined_at), col(Member.user_id))
  )
  return list(db.exec(statement).all())


def count_members(db: Session, group_id: UUID) -> int:
  """Conta quantos membros pertencem ao grupo. Não faz commit."""
  statement = (
    select(func.count()).select_from(Member).where(col(Member.group_id) == group_id)
  )
  return db.exec(statement).one()


def count_members_by_group(db: Session, group_ids: list[UUID]) -> dict[UUID, int]:
  """Conta membros de vários grupos numa consulta só com GROUP BY. Não faz commit."""
  if not group_ids:
    return {}

  statement = (
    select(col(Member.group_id), func.count())
    .where(col(Member.group_id).in_(group_ids))
    .group_by(col(Member.group_id))
  )
  counts = dict(db.exec(statement).all())
  return {group_id: counts.get(group_id, 0) for group_id in group_ids}


def add_member(db: Session, member: Member) -> Member:
  """Adiciona um membro ao grupo e faz flush. Não faz commit."""
  db.add(member)
  db.flush()
  return member


def remove_member(db: Session, member: Member) -> None:
  """Remove um membro do grupo e faz flush. Não faz commit."""
  db.delete(member)
  db.flush()


def delete_group(db: Session, group: Group) -> None:
  """Exclui o grupo (membros e hábitos de grupo saem em cascata). Não faz commit."""
  db.delete(group)
  db.flush()


def list_groups_of_user(db: Session, user_id: UUID) -> list[tuple[Group, Member]]:
  """Lista pares (Group, Member) dos grupos do usuário. Não faz commit."""
  statement = (
    select(Group, Member)
    .join(Member, col(Member.group_id) == col(Group.id))
    .where(col(Member.user_id) == user_id)
  )
  return list(db.exec(statement).all())


def list_group_ids_of_user(db: Session, user_id: UUID) -> set[UUID]:
  """Retorna o conjunto de IDs dos grupos em que o usuário participa. Não faz commit."""
  statement = select(col(Member.group_id)).where(col(Member.user_id) == user_id)
  return set(db.exec(statement).all())


def set_member_role(db: Session, member: Member, role: GroupRole) -> Member:
  """Atualiza o papel do membro e faz flush. Não faz commit."""
  member.role = role.value
  db.add(member)
  db.flush()
  return member


def count_admins(db: Session, group_id: UUID) -> int:
  """Conta quantos administradores o grupo possui. Não faz commit."""
  statement = (
    select(func.count())
    .select_from(Member)
    .where(
      col(Member.group_id) == group_id,
      col(Member.role) == GroupRole.ADMIN.value,
    ),
  )
  return db.exec(statement).one()


def get_oldest_member(
  db: Session, group_id: UUID, excluding_user_id: UUID
) -> Member | None:
  """Busca o integrante mais antigo do grupo,
  exceto o usuário informado. Não faz commit."""
  statement = (
    select(Member)
    .where(
      col(Member.group_id) == group_id,
      col(Member.user_id) != excluding_user_id,
    )
    .order_by(col(Member.joined_at), col(Member.user_id))
    .limit(1)
  )
  return db.exec(statement).first()
