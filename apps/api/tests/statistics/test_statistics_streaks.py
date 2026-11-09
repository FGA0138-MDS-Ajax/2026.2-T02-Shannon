from datetime import date

import pytest

from tests.conftest import at_noon

CHECK_IN_DAYS = [
  date(2026, 10, 22),
  date(2026, 10, 23),
  date(2026, 10, 24),
  date(2026, 10, 25),
  date(2026, 10, 28),
  date(2026, 10, 29),
  date(2026, 10, 30),
]


@pytest.mark.parametrize(
  ("today", "expected"),
  [
    (date(2026, 10, 30), {"current": 3, "best": 4}),
    (date(2026, 10, 31), {"current": 3, "best": 4}),
    (date(2026, 11, 2), {"current": 0, "best": 4}),
  ],
)
def test_activity_streak_keeps_today_open_and_breaks_after_missed_day(
  client,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
  today,
  expected,
):
  # Garante que hoje sem check-in não zera a sequência, mas um dia perdido zera.
  freeze_today(today)
  habit = habit_factory()
  for day in CHECK_IN_DAYS:
    check_in_factory(habit, created_at=at_noon(day))

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  assert response.json()["activity_streak"] == expected


def test_activity_streak_counts_check_ins_of_deleted_habit(
  client, auth_headers, habit_factory, check_in_factory, freeze_today
):
  # Garante que check-ins que ficaram sem hábito continuam na atividade.
  freeze_today(date(2026, 10, 30))
  habit = habit_factory()
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 29)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 30)))

  deleted = client.delete(f"/habits/{habit.id}", headers=auth_headers)
  assert deleted.status_code == 204

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  data = response.json()
  assert data["activity_streak"]["current"] == 2
  assert data["check_ins"]["total"] == 2
  assert data["habits"]["total"] == 0
