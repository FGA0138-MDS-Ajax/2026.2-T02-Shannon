from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.group.models import Group, Member


def get_group(db: Session, group_id: UUID) -> Group | None:
  """Busca o grupo pelo id. Não faz commit."""
  return db.get(Group, group_id)


def get_group_for_update(db: Session, group_id: UUID) -> Group | None:
  """Busca o grupo pelo id com lock de linha (FOR UPDATE). Não faz commit."""
  statement = select(Group).where(col(Group.id) == group_id).with_for_update()
  return db.exec(statement).first()


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


def count_members(db: Session, group_id: UUID) -> int:
  """Conta quantos membros pertencem ao grupo. Não faz commit."""
  statement = (
    select(func.count()).select_from(Member).where(col(Member.group_id) == group_id)
  )
  return db.exec(statement).one()


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
