"""FOTO-6: regra pura de visibilidade da foto, sem banco."""

from uuid import uuid4

from app.habits.models import Habit
from app.photos.visibility import can_view_photo

AUTHOR, VIEWER = uuid4(), uuid4()
GROUP, OTHER_GROUP = uuid4(), uuid4()


def _personal(*, public: bool = False) -> Habit:
  return Habit(
    name="Pessoal", category="outros", author_user_id=AUTHOR, is_public=public
  )


def _of_group(group_id) -> Habit:
  return Habit(name="Do grupo", category="outros", author_group_id=group_id)


def test_author_can_view() -> None:
  assert can_view_photo(AUTHOR, [_personal()], AUTHOR, set()) is True


def test_member_of_the_group_that_owns_a_habit_can_view() -> None:
  assert can_view_photo(AUTHOR, [_of_group(GROUP)], VIEWER, {GROUP}) is True


def test_member_can_view_mixed_check_in() -> None:
  habits = [_personal(), _of_group(GROUP)]

  assert can_view_photo(AUTHOR, habits, VIEWER, {GROUP}) is True


def test_public_personal_habit_of_someone_else_does_not_give_access() -> None:
  assert can_view_photo(AUTHOR, [_personal(public=True)], VIEWER, set()) is False


def test_member_of_another_group_cannot_view() -> None:
  assert can_view_photo(AUTHOR, [_of_group(GROUP)], VIEWER, {OTHER_GROUP}) is False


def test_check_in_without_habits_is_hidden_from_others() -> None:
  assert can_view_photo(AUTHOR, [], VIEWER, {GROUP}) is False
