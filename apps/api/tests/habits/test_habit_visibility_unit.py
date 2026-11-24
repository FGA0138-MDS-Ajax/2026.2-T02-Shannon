from collections.abc import Iterator
from uuid import uuid4

import pytest

from app.auth.models import User
from app.habits.models import Habit, HabitCategory
from app.habits.service import can_view_habit


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Testes puros de `can_view_habit` não usam banco: substitui o `run_before` raiz."""
  yield


def _user() -> User:
  return User(
    name="Usuário",
    username="usuario",
    email="usuario@teste.com",
    password_hash="hash_de_teste",
  )


def _personal_habit(author: User, *, is_public: bool = False) -> Habit:
  return Habit(
    name="Hábito pessoal",
    category=HabitCategory.OUTROS,
    author_user_id=author.id,
    is_public=is_public,
  )


def _group_habit(group_id, *, is_public: bool = False) -> Habit:
  return Habit(
    name="Hábito do grupo",
    category=HabitCategory.OUTROS,
    author_group_id=group_id,
    is_public=is_public,
  )


def test_personal_habit_of_the_user_is_visible():
  user = _user()

  assert can_view_habit(_personal_habit(user), user) is True


def test_public_personal_habit_of_another_user_is_visible():
  user, other = _user(), _user()

  assert can_view_habit(_personal_habit(other, is_public=True), user) is True


def test_private_personal_habit_of_another_user_is_not_visible():
  user, other = _user(), _user()

  assert can_view_habit(_personal_habit(other), user) is False


def test_group_habit_is_visible_when_group_is_in_group_ids():
  user, group_id = _user(), uuid4()

  assert can_view_habit(_group_habit(group_id), user, frozenset({group_id})) is True


def test_group_habit_is_not_visible_when_group_is_not_in_group_ids():
  user = _user()
  habit = _group_habit(uuid4())

  assert can_view_habit(habit, user, frozenset({uuid4()})) is False


def test_group_habit_is_not_visible_without_group_ids():
  assert can_view_habit(_group_habit(uuid4()), _user()) is False


def test_public_group_habit_is_not_visible_to_non_member():
  habit = _group_habit(uuid4(), is_public=True)

  assert can_view_habit(habit, _user(), frozenset()) is False
