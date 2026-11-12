from datetime import date

from app.group.habits import group_reference_date
from app.group.models import Group, RankingCriterion
from app.habits.models import Habit, HabitCategory, HabitStatus

TODAY = date(2026, 11, 11)


def _make_group(*, ends_on: date | None) -> Group:
  return Group(
    name="Grupo Teste",
    starts_on=date(2026, 11, 1),
    ends_on=ends_on,
    ranking_criterion=RankingCriterion.CHECK_INS,
    invite_code="TEST1234",
  )


def _make_habit(*, finished_at: date | None = None) -> Habit:
  return Habit(
    name="Correr",
    category=HabitCategory.CORRIDA,
    created_at=date(2026, 11, 1),
    status=HabitStatus.FINISHED if finished_at else HabitStatus.ACTIVE,
    finished_at=finished_at,
  )


def test_active_group_without_ends_on_uses_today() -> None:
  group = _make_group(ends_on=None)

  assert group_reference_date(group, _make_habit(), TODAY) == TODAY


def test_active_group_with_future_ends_on_uses_today() -> None:
  group = _make_group(ends_on=date(2026, 12, 31))

  assert group_reference_date(group, _make_habit(), TODAY) == TODAY


def test_group_ending_today_uses_today() -> None:
  group = _make_group(ends_on=TODAY)

  assert group_reference_date(group, _make_habit(), TODAY) == TODAY


def test_ended_group_uses_ends_on() -> None:
  group = _make_group(ends_on=date(2026, 11, 5))

  assert group_reference_date(group, _make_habit(), TODAY) == date(2026, 11, 5)


def test_habit_finished_before_group_end_uses_finished_at() -> None:
  group = _make_group(ends_on=date(2026, 11, 8))
  habit = _make_habit(finished_at=date(2026, 11, 3))

  assert group_reference_date(group, habit, TODAY) == date(2026, 11, 3)


def test_habit_finished_after_group_end_uses_ends_on() -> None:
  group = _make_group(ends_on=date(2026, 11, 3))
  habit = _make_habit(finished_at=date(2026, 11, 8))

  assert group_reference_date(group, habit, TODAY) == date(2026, 11, 3)


def test_habit_finished_in_active_group_uses_finished_at() -> None:
  group = _make_group(ends_on=None)
  habit = _make_habit(finished_at=date(2026, 11, 6))

  assert group_reference_date(group, habit, TODAY) == date(2026, 11, 6)
