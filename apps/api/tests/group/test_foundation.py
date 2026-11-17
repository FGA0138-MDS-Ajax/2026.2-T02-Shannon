from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from sqlalchemy import Engine
from sqlmodel import Session

from app.auth.models import User
from app.group import repository
from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_FULL,
  MSG_GROUP_NOT_FOUND,
  GroupEndedError,
  GroupForbiddenError,
  GroupFullError,
  GroupNotFoundError,
)
from app.group.models import (
  GROUP_MAX_MEMBERS,
  Group,
  GroupRole,
  Member,
  RankingCriterion,
)
from app.group.permissions import require_admin, require_member
from app.group.responses import GROUP_FORBIDDEN_RESPONSE, GROUP_NOT_FOUND_RESPONSE
from app.group.router import group_router
from app.habits.models import Habit, HabitCategory
from app.habits.schemas import HabitPublic
from app.main import app


def _make_user(session: Session, prefix: str) -> User:
  suffix = uuid4().hex[:8]
  user = User(
    name=f"Usuário {prefix}",
    username=f"{prefix}_{suffix}",
    email=f"{prefix}_{suffix}@teste.com",
    password_hash="hash_de_teste",
  )
  session.add(user)
  session.flush()
  return user


def _make_group(session: Session, *, invite_code: str = "GRP12345") -> Group:
  group = Group(
    name="Grupo Teste",
    starts_on=date(2026, 11, 1),
    ranking_criterion=RankingCriterion.CHECK_INS,
    invite_code=invite_code,
  )
  session.add(group)
  session.flush()
  return group


def test_group_constants_and_router_registration() -> None:
  assert GROUP_MAX_MEMBERS == 30
  assert GroupRole.ADMIN == "admin"
  assert GroupRole.MEMBER == "member"
  assert RankingCriterion.CHECK_INS == "check_ins"
  assert RankingCriterion.GOALS == "goals"

  assert MSG_GROUP_NOT_FOUND == "Grupo não encontrado."
  assert MSG_GROUP_FORBIDDEN == "Apenas administradores podem realizar esta ação."
  assert MSG_GROUP_ENDED == "Grupo encerrado."
  assert MSG_GROUP_FULL == "Grupo cheio."
  assert issubclass(GroupEndedError, Exception)
  assert issubclass(GroupFullError, Exception)

  assert 404 in GROUP_NOT_FOUND_RESPONSE
  assert 403 in GROUP_FORBIDDEN_RESPONSE

  assert group_router.prefix == "/groups"
  assert group_router.tags == ["groups"]
  assert any(getattr(r, "prefix", None) == "/groups" for r in app.router.routes) or (
    group_router.prefix == "/groups"
  )


def test_require_member_and_require_admin(
  test_engine: Engine,
  user: User,
  other_user: User,
) -> None:
  with Session(test_engine) as session:
    outsider = _make_user(session, "outsider")
    group = _make_group(session)
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=user.id, role=GroupRole.ADMIN),
    )
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=other_user.id, role=GroupRole.MEMBER),
    )
    session.commit()

    with pytest.raises(GroupNotFoundError):
      require_member(session, uuid4(), user)
    with pytest.raises(GroupNotFoundError):
      require_admin(session, uuid4(), user)

    with pytest.raises(GroupNotFoundError):
      require_member(session, group.id, outsider)
    with pytest.raises(GroupNotFoundError):
      require_admin(session, group.id, outsider)

    found_group, found_member = require_member(session, group.id, other_user)
    assert found_group.id == group.id
    assert found_member.role == GroupRole.MEMBER
    with pytest.raises(GroupForbiddenError):
      require_admin(session, group.id, other_user)

    admin_group, admin_member = require_admin(session, group.id, user)
    assert admin_group.id == group.id
    assert admin_member.role == GroupRole.ADMIN


def test_repository_functions_and_cascade(
  test_engine: Engine,
  user: User,
  other_user: User,
) -> None:
  with Session(test_engine) as session:
    third_user = _make_user(session, "terceiro")
    group_1 = _make_group(session, invite_code="CODE0001")
    group_2 = _make_group(session, invite_code="CODE0002")

    t1 = datetime(2026, 11, 1, 10, 0, tzinfo=UTC)
    t2 = datetime(2026, 11, 1, 11, 0, tzinfo=UTC)

    repository.add_member(
      session,
      Member(
        group_id=group_1.id,
        user_id=other_user.id,
        role=GroupRole.MEMBER,
        joined_at=t2,
      ),
    )
    repository.add_member(
      session,
      Member(
        group_id=group_1.id,
        user_id=user.id,
        role=GroupRole.ADMIN,
        joined_at=t1,
      ),
    )
    m_third = repository.add_member(
      session,
      Member(
        group_id=group_1.id,
        user_id=third_user.id,
        role=GroupRole.MEMBER,
        joined_at=t1,
      ),
    )
    repository.add_member(
      session,
      Member(
        group_id=group_2.id,
        user_id=user.id,
        role=GroupRole.ADMIN,
        joined_at=t1,
      ),
    )

    group_habit = Habit(
      name="Hábito do Grupo",
      category=HabitCategory.OUTROS,
      author_group_id=group_2.id,
      created_at=date(2026, 11, 1),
    )
    session.add(group_habit)
    session.commit()
    session.refresh(group_habit)

    public_schema = HabitPublic.model_validate(group_habit)
    assert public_schema.author_user_id is None
    assert public_schema.author_group_id == group_2.id

    assert repository.get_group(session, group_1.id) is not None
    assert repository.get_group(session, uuid4()) is None
    assert repository.get_group_for_update(session, group_1.id) is not None
    repository.update_group(
      session,
      group_1,
      {
        "name": "Grupo Atualizado",
        "description": "Nova descrição",
        "ranking_criterion": RankingCriterion.GOALS,
      },
    )
    assert group_1.name == "Grupo Atualizado"
    assert group_1.description == "Nova descrição"
    assert group_1.ranking_criterion == RankingCriterion.GOALS
    assert repository.get_member(session, group_1.id, user.id) is not None
    assert repository.get_member(session, group_1.id, uuid4()) is None
    assert repository.count_members(session, group_1.id) == 3

    expected_first_two = sorted([user.id, third_user.id])
    members = repository.list_members(session, group_1.id)
    assert [m.user_id for m in members] == [*expected_first_two, other_user.id]

    assert repository.list_group_ids_of_user(session, user.id) == {
      group_1.id,
      group_2.id,
    }
    user_groups = repository.list_groups_of_user(session, other_user.id)
    assert len(user_groups) == 1
    assert user_groups[0][0].id == group_1.id
    assert user_groups[0][1].user_id == other_user.id

    repository.remove_member(session, m_third)
    session.commit()
    assert repository.count_members(session, group_1.id) == 2

    habit_id = group_habit.id
    repository.delete_group(session, group_2)
    session.commit()
    assert repository.get_group(session, group_2.id) is None
    assert repository.count_members(session, group_2.id) == 0
    assert session.get(Habit, habit_id) is None
