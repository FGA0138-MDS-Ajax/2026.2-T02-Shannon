from datetime import date, datetime, time
from uuid import uuid4

import pytest
from sqlalchemy import Engine
from sqlmodel import Session

from app.auth.models import User
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.habits.exceptions import (
  GroupHabitForbiddenError,
  HabitForbiddenError,
  HabitNotFoundError,
)
from app.habits.models import Habit, HabitCategory
from app.habits.service import APP_TIMEZONE, get_owned_habit, get_visible_habit
from tests.conftest import _create_user, _save


@pytest.fixture
def group(test_engine: Engine) -> Group:
  return _save(
    test_engine,
    Group(
      name="Grupo Teste",
      starts_on=date(2026, 10, 1),
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code=uuid4().hex[:8].upper(),
    ),
  )


@pytest.fixture
def group_habit(test_engine: Engine, group: Group) -> Habit:
  return _save(
    test_engine,
    Habit(
      name="Hábito do grupo",
      category=HabitCategory.CORRIDA,
      created_at=date(2026, 11, 1),
      author_group_id=group.id,
    ),
  )


def _join(
  engine: Engine, group: Group, user: User, role: GroupRole = GroupRole.MEMBER
) -> Member:
  return _save(
    engine,
    Member(
      group_id=group.id,
      user_id=user.id,
      role=role,
      joined_at=datetime.combine(date(2026, 10, 1), time(12, 0), tzinfo=APP_TIMEZONE),
    ),
  )


def _leave(engine: Engine, member: Member) -> None:
  with Session(engine) as session:
    session.delete(session.get(Member, (member.group_id, member.user_id)))
    session.commit()


# --- get_visible_habit ---


def test_visible_member_sees_group_habit(test_engine, user, group, group_habit):
  _join(test_engine, group, user)

  with Session(test_engine) as db:
    assert get_visible_habit(db, group_habit.id, user).id == group_habit.id


def test_visible_non_member_gets_not_found(test_engine, user, group_habit):
  with Session(test_engine) as db, pytest.raises(HabitNotFoundError):
    get_visible_habit(db, group_habit.id, user)


def test_visible_user_who_left_gets_not_found(test_engine, user, group, group_habit):
  member = _join(test_engine, group, user)
  _leave(test_engine, member)

  with Session(test_engine) as db, pytest.raises(HabitNotFoundError):
    get_visible_habit(db, group_habit.id, user)


def test_visible_personal_habit_is_unchanged(test_engine, user, habit_factory):
  own = habit_factory()
  private_of_other = habit_factory(author=_create_user(test_engine, "terceiro"))
  public_of_other = habit_factory(
    author=_create_user(test_engine, "publico"), is_public=True
  )

  with Session(test_engine) as db:
    assert get_visible_habit(db, own.id, user).id == own.id
    assert get_visible_habit(db, public_of_other.id, user).id == public_of_other.id
    with pytest.raises(HabitNotFoundError):
      get_visible_habit(db, private_of_other.id, user)


def test_visible_missing_habit_gets_not_found(test_engine, user):
  with Session(test_engine) as db, pytest.raises(HabitNotFoundError):
    get_visible_habit(db, uuid4(), user)


# --- get_owned_habit ---


def test_owned_regular_member_gets_forbidden_on_group_habit(
  test_engine, user, group, group_habit
):
  _join(test_engine, group, user, GroupRole.MEMBER)

  with Session(test_engine) as db, pytest.raises(HabitForbiddenError):
    get_owned_habit(db, group_habit.id, user)


def test_owned_admin_gets_forbidden_on_group_habit(
  test_engine, user, group, group_habit
):
  _join(test_engine, group, user, GroupRole.ADMIN)

  with Session(test_engine) as db, pytest.raises(HabitForbiddenError):
    get_owned_habit(db, group_habit.id, user)


def test_owned_non_member_gets_not_found_on_group_habit(test_engine, user, group_habit):
  with Session(test_engine) as db, pytest.raises(HabitNotFoundError):
    get_owned_habit(db, group_habit.id, user)


def test_owned_author_of_personal_habit_still_passes(test_engine, user, habit_factory):
  habit = habit_factory()

  with Session(test_engine) as db:
    assert get_owned_habit(db, habit.id, user).id == habit.id


def test_owned_other_user_on_public_personal_habit_gets_forbidden(
  test_engine, user, habit_factory
):
  habit = habit_factory(author=_create_user(test_engine, "autor"), is_public=True)

  with Session(test_engine) as db, pytest.raises(HabitForbiddenError):
    get_owned_habit(db, habit.id, user)


def test_visible_admin_sees_group_habit(test_engine, user, group, group_habit):
  _join(test_engine, group, user, GroupRole.ADMIN)

  with Session(test_engine) as db:
    assert get_visible_habit(db, group_habit.id, user).id == group_habit.id


def test_group_habit_forbidden_is_a_habit_forbidden_error():
  assert issubclass(GroupHabitForbiddenError, HabitForbiddenError)


@pytest.mark.parametrize("role", [GroupRole.MEMBER, GroupRole.ADMIN])
def test_owned_group_habit_raises_the_specific_error(
  test_engine, user, group, group_habit, role
):
  _join(test_engine, group, user, role)

  with Session(test_engine) as db, pytest.raises(GroupHabitForbiddenError):
    get_owned_habit(db, group_habit.id, user)


def test_owned_personal_habit_of_another_user_is_not_the_group_error(
  test_engine, user, habit_factory
):
  habit = habit_factory(author=_create_user(test_engine, "autor2"), is_public=True)

  with Session(test_engine) as db, pytest.raises(HabitForbiddenError) as exc_info:
    get_owned_habit(db, habit.id, user)

  assert not isinstance(exc_info.value, GroupHabitForbiddenError)
