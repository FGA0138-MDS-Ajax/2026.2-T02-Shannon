import re
from datetime import date

import pytest
from sqlalchemy import event
from sqlmodel import Session

from app.goals.service import calculate_habits_progress, get_habit_progress
from app.habits.models import HabitStatus
from tests.conftest import at_noon
from tests.group.test_group_habits import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
  _sp,
)


def _load(engine, habit_ids):
  """Recarrega os hábitos (com meta) numa sessão que o teste mantém aberta."""
  from sqlmodel import select

  from app.habits.models import Habit

  db = Session(engine)
  habits = list(db.exec(select(Habit).where(Habit.id.in_(habit_ids))).all())  # type: ignore[attr-defined]
  for habit in habits:
    _ = habit.goal
  return db, habits


def test_personal_habits_are_unchanged_without_user(
  test_engine, user, habit_factory, goal_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  habit = habit_factory()
  goal_factory(habit)
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 10)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits)

  assert progress[habit.id].current_streak == 1


def test_group_habit_without_user_raises_value_error(test_engine, user, freeze_today):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)

  db, habits = _load(test_engine, [habit.id])
  with db, pytest.raises(ValueError, match="exigem `user`"):
    calculate_habits_progress(db, habits)


def test_group_habit_without_goal_and_without_user_does_not_raise(
  test_engine, user, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group, with_goal=False)

  db, habits = _load(test_engine, [habit.id])
  with db:
    assert calculate_habits_progress(db, habits) == {}


def test_group_habit_progress_is_the_users_own(
  test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 9)))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 10)))
  check_in_factory(habit, user=other_user, created_at=at_noon(date(2026, 11, 8)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits, user)

  assert progress[habit.id].habit_id == habit.id
  # só os dias 9 e 10 do usuário contam; o check-in do outro membro (dia 8) não
  assert progress[habit.id].current_streak == 2
  assert progress[habit.id].streak_started_on == date(2026, 11, 9)


def test_group_habit_ignores_check_ins_before_joining(
  test_engine, user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, joined_at=_sp(date(2026, 11, 10), 8))
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 8)))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 10)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits, user)

  # o check-in do dia 8 é anterior à entrada e não conta: o streak começa no dia 10
  assert progress[habit.id].best_streak == 1
  assert progress[habit.id].streak_started_on == date(2026, 11, 10)


def test_group_habit_uses_group_end_as_reference_date(
  test_engine, user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine, ends_on=date(2026, 11, 10))
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 10)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits, user)

  period = progress[habit.id].current_period
  assert (period.start, period.end) == (date(2026, 11, 10), date(2026, 11, 10))
  assert period.done == 1


def test_mixed_habits_use_a_fixed_number_of_queries(
  test_engine, user, habit_factory, goal_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory()
  goal_factory(personal)
  habit_ids = [personal.id]
  for _ in range(3):
    group = _make_group(test_engine)
    _add_member(test_engine, group, user)
    habit_ids.append(_make_group_habit(test_engine, group).id)

  db, habits = _load(test_engine, habit_ids)
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    statements.append(statement)

  with db:
    event.listen(test_engine, "before_cursor_execute", before_execute)
    try:
      progress = calculate_habits_progress(db, habits, user)
    finally:
      event.remove(test_engine, "before_cursor_execute", before_execute)

  assert len(progress) == 4
  # pessoais + grupos + check-ins dos grupos, independente de quantos grupos
  assert len(statements) == 3


def test_get_habit_progress_works_for_member_of_group_habit(
  test_engine, user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 10)))

  with Session(test_engine) as db:
    progress = get_habit_progress(db, habit.id, user)

  assert progress.current_streak == 1


def _count_group_selects(engine, call) -> tuple[list[str], object]:
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    statements.append(statement)

  event.listen(engine, "before_cursor_execute", before_execute)
  try:
    value = call()
  finally:
    event.remove(engine, "before_cursor_execute", before_execute)
  return [st for st in statements if re.search(r'FROM "?groups"?(\s|$)', st)], value


def test_groups_by_id_skips_the_groups_query(test_engine, user, freeze_today):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  db, habits = _load(test_engine, [habit.id])

  with db:
    without_dict, _ = _count_group_selects(
      test_engine, lambda: calculate_habits_progress(db, habits, user)
    )
    with_dict, progress = _count_group_selects(
      test_engine,
      lambda: calculate_habits_progress(db, habits, user, {group.id: group}),
    )

  assert len(without_dict) == 1
  assert with_dict == []
  assert habit.id in progress  # type: ignore[operator]


def test_groups_by_id_missing_a_group_raises_key_error(test_engine, user, freeze_today):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  db, habits = _load(test_engine, [habit.id])

  with db, pytest.raises(KeyError):
    calculate_habits_progress(db, habits, user, {})


# Lacunas da auditoria (GRP-10)


def test_personal_only_with_user_matches_without_user(
  test_engine, user, habit_factory, goal_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  habit = habit_factory()
  goal_factory(habit)
  for day in (9, 10):
    check_in_factory(habit, created_at=at_noon(date(2026, 11, day)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    with_user = calculate_habits_progress(db, habits, user)
    without_user = calculate_habits_progress(db, habits)

  assert with_user == without_user
  assert with_user[habit.id].current_streak == 2


def test_two_members_of_same_habit_have_different_progress(
  test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)
  for day in (8, 9, 10):
    check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, day)))
  check_in_factory(habit, user=other_user, created_at=at_noon(date(2026, 11, 10)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    mine = calculate_habits_progress(db, habits, user)[habit.id]
    theirs = calculate_habits_progress(db, habits, other_user)[habit.id]

  assert (mine.current_streak, theirs.current_streak) == (3, 1)


def test_group_habit_finished_before_group_end_uses_finished_at(
  test_engine, user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine, ends_on=date(2026, 11, 10))
  _add_member(test_engine, group, user)
  habit = _make_group_habit(
    test_engine, group, status=HabitStatus.FINISHED, finished_at=date(2026, 11, 7)
  )
  for day in (6, 7, 8):
    check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, day)))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits, user)[habit.id]

  period = progress.current_period
  assert (period.start, period.end) == (date(2026, 11, 7), date(2026, 11, 7))
  # o dia 8 é posterior ao encerramento do hábito e não conta
  assert progress.current_streak == 2


def test_habits_without_goal_are_left_out(
  test_engine, user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group, with_goal=False)

  db, habits = _load(test_engine, [personal.id, group_habit.id])
  with db:
    assert calculate_habits_progress(db, habits, user) == {}


def test_group_check_in_late_at_night_counts_on_sao_paulo_day(
  test_engine, user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=_sp(date(2026, 11, 10), 23, 50))

  db, habits = _load(test_engine, [habit.id])
  with db:
    progress = calculate_habits_progress(db, habits, user)[habit.id]

  assert progress.streak_started_on == date(2026, 11, 10)
  assert progress.current_streak == 1
