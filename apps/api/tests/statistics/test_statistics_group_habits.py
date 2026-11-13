"""GRP-10: estatísticas pessoais não mudam com hábitos de grupo."""

from datetime import date

import pytest

from app.group.models import GroupRole
from app.habits.exceptions import MSG_GROUP_HABIT_FORBIDDEN, MSG_HABIT_NOT_FOUND
from tests.conftest import at_noon
from tests.group.test_group_habits import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
)

CHECK_IN_KEYS = {"check_ins", "activity_streak", "series"}


def _statistics_before_and_after_group_check_in(
  client, test_engine, user, auth_headers, habit_factory, goal_factory, check_in_factory
) -> tuple[dict, dict]:
  personal = habit_factory(created_at=date(2026, 11, 1))
  goal_factory(personal)
  for day in (9, 10):
    check_in_factory(personal, created_at=at_noon(date(2026, 11, day)))

  before = client.get("/user/statistics", headers=auth_headers)
  assert before.status_code == 200

  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group)
  check_in_factory(group_habit, user=user, created_at=at_noon(date(2026, 11, 11)))

  after = client.get("/user/statistics", headers=auth_headers)
  assert after.status_code == 200
  return before.json(), after.json()


def test_user_statistics_habit_sections_unchanged_after_group_check_in(
  client,
  test_engine,
  user,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  before, after = _statistics_before_and_after_group_check_in(
    client,
    test_engine,
    user,
    auth_headers,
    habit_factory,
    goal_factory,
    check_in_factory,
  )

  for key in set(before) - CHECK_IN_KEYS:
    assert after[key] == before[key], key


def test_user_statistics_unchanged_after_joining_group_with_habit_and_no_check_in(
  client,
  test_engine,
  user,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  personal = habit_factory(created_at=date(2026, 11, 1))
  goal_factory(personal)
  for day in (9, 10):
    check_in_factory(personal, created_at=at_noon(date(2026, 11, day)))
  before = client.get("/user/statistics", headers=auth_headers).json()

  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _make_group_habit(test_engine, group)
  after = client.get("/user/statistics", headers=auth_headers).json()

  assert set(after) == set(before)
  for key in before:
    assert after[key] == before[key], key


def test_group_check_in_counts_in_totals_but_not_in_per_habit_sections(
  client,
  test_engine,
  user,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  before, after = _statistics_before_and_after_group_check_in(
    client,
    test_engine,
    user,
    auth_headers,
    habit_factory,
    goal_factory,
    check_in_factory,
  )

  # Totais: o check-in de grupo (dia 11, "hoje") entra em todos os contadores.
  for counter in ("total", "today", "week", "month"):
    assert after["check_ins"][counter] == before["check_ins"][counter] + 1, counter
  assert before["activity_streak"] == {"current": 2, "best": 2}
  assert after["activity_streak"] == {"current": 3, "best": 3}

  # Série diária: só o ponto do dia do check-in sobe, de 0 para 1.
  before_points = {p["date"]: p["count"] for p in before["series"]["points"]}
  after_points = {p["date"]: p["count"] for p in after["series"]["points"]}
  assert after_points[TODAY.isoformat()] == before_points[TODAY.isoformat()] + 1
  unchanged = {d: c for d, c in after_points.items() if d != TODAY.isoformat()}
  assert unchanged == {d: c for d, c in before_points.items() if d != TODAY.isoformat()}
  assert after["series"]["start"] == before["series"]["start"]
  assert after["series"]["end"] == before["series"]["end"]

  # Seções por hábito: só hábitos pessoais, idênticas às de antes do check-in.
  for key in ("habits", "habit_progress", "goal_completion"):
    assert after[key] == before[key], key
  for key in set(before) - CHECK_IN_KEYS:
    assert after[key] == before[key], key


def test_user_statistics_unchanged_after_only_joining_group(
  client, test_engine, user, auth_headers, habit_factory, goal_factory, freeze_today
):
  freeze_today(TODAY)
  goal_factory(habit_factory(created_at=date(2026, 11, 1)))
  before = client.get("/user/statistics", headers=auth_headers).json()

  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  _make_group_habit(test_engine, group)

  assert client.get("/user/statistics", headers=auth_headers).json() == before


@pytest.mark.parametrize("suffix", ["", "/calendar"])
@pytest.mark.parametrize("role", [GroupRole.MEMBER, GroupRole.ADMIN])
def test_habit_statistics_on_group_habit_returns_403(
  client, test_engine, user, auth_headers, freeze_today, suffix, role
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=role)
  habit = _make_group_habit(test_engine, group)

  response = client.get(
    f"/user/statistics/habits/{habit.id}{suffix}", headers=auth_headers
  )

  assert response.status_code == 403
  assert response.json()["detail"] == MSG_GROUP_HABIT_FORBIDDEN


@pytest.mark.parametrize("suffix", ["", "/calendar"])
def test_habit_statistics_on_group_habit_of_non_member_returns_404(
  client, test_engine, user, auth_headers, other_user, freeze_today, suffix
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)

  response = client.get(
    f"/user/statistics/habits/{habit.id}{suffix}", headers=auth_headers
  )

  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND


@pytest.mark.parametrize("suffix", ["", "/calendar"])
def test_habit_statistics_on_public_habit_of_another_user_stays_404(
  client, auth_headers, other_user, habit_factory, goal_factory, freeze_today, suffix
):
  freeze_today(TODAY)
  habit = habit_factory(author=other_user, is_public=True)
  goal_factory(habit)

  response = client.get(
    f"/user/statistics/habits/{habit.id}{suffix}", headers=auth_headers
  )

  # escopo estreito: só o hábito de grupo propaga 403; o público de outro segue 404
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND
