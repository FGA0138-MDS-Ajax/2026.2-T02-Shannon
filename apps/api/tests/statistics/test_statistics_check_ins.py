from datetime import date, datetime, timedelta

import pytest

from app.habits.service import APP_TIMEZONE
from tests.conftest import at_noon

TODAY = date(2026, 11, 2)


def test_statistics_ignore_other_users_data(
  client,
  auth_headers,
  other_user,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Garante que hábitos e check-ins de outra pessoa não vazam em nenhum bloco.
  freeze_today(TODAY)
  for name in ["Correr", "Ler"]:
    other_habit = habit_factory(author=other_user, name=name, is_public=True)
    goal_factory(other_habit)
    for offset in range(5):
      check_in_factory(other_habit, created_at=at_noon(TODAY - timedelta(offset)))
  other_finished = habit_factory(author=other_user, finished=True)
  goal_factory(other_finished)

  habit = habit_factory(name="Meditar")
  goal_factory(habit)
  check_in_factory(habit, created_at=at_noon(TODAY))

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  data = response.json()
  assert data["habits"] == {"total": 1, "active": 1, "finished": 0}
  assert data["check_ins"] == {"total": 1, "today": 1, "week": 1, "month": 1}
  assert data["completed_habits"] == {"today": 1, "week": 1, "month": 1}
  assert data["goal_completion"]["completed_periods"] == 1
  assert data["goal_completion"]["total_periods"] == 30
  assert data["activity_streak"] == {"current": 1, "best": 1}
  assert data["at_risk"] == {"count": 0, "habit_ids": []}
  assert [item["habit_id"] for item in data["habit_progress"]] == [str(habit.id)]
  assert sum(point["count"] for point in data["series"]["points"]) == 1


@pytest.mark.parametrize(
  ("mode", "expected"),
  [
    ("calendar", {"total": 5, "today": 1, "week": 1, "month": 2}),
    ("rolling", {"total": 5, "today": 1, "week": 3, "month": 4}),
  ],
)
def test_check_ins_week_and_month_follow_mode(
  client, auth_headers, habit_factory, check_in_factory, freeze_today, mode, expected
):
  # Garante a diferença entre semana/mês do calendário e últimos 7/30 dias.
  freeze_today(TODAY)
  habit = habit_factory()
  for day in [
    date(2026, 11, 2),
    date(2026, 11, 1),
    date(2026, 10, 28),
    date(2026, 10, 26),
    date(2026, 10, 1),
  ]:
    check_in_factory(habit, created_at=at_noon(day))

  response = client.get("/user/statistics", headers=auth_headers, params={"mode": mode})

  assert response.status_code == 200
  data = response.json()
  assert data["mode"] == mode
  assert data["check_ins"] == expected


def test_late_night_check_in_counts_on_sao_paulo_day(
  client, auth_headers, habit_factory, check_in_factory, freeze_today
):
  # Garante que 23h30 em São Paulo (02h30 UTC do dia seguinte) conta no dia local.
  freeze_today(TODAY)
  habit = habit_factory()
  check_in_factory(habit, created_at=datetime(2026, 11, 1, 23, 30, tzinfo=APP_TIMEZONE))

  response = client.get("/user/statistics", headers=auth_headers, params={"days": 2})

  assert response.status_code == 200
  data = response.json()
  assert data["series"]["points"] == [
    {"date": "2026-11-01", "count": 1},
    {"date": "2026-11-02", "count": 0},
  ]
  assert data["check_ins"]["today"] == 0


def test_series_counts_check_ins_per_day_in_ascending_order(
  client, auth_headers, habit_factory, check_in_factory, freeze_today
):
  # Garante que a série soma vários check-ins no mesmo dia e preenche dias vazios.
  freeze_today(TODAY)
  habit = habit_factory()
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 31)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 31)))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 2)))

  response = client.get("/user/statistics", headers=auth_headers, params={"days": 3})

  assert response.status_code == 200
  series = response.json()["series"]
  assert series["start"] == "2026-10-31"
  assert series["end"] == "2026-11-02"
  assert series["points"] == [
    {"date": "2026-10-31", "count": 2},
    {"date": "2026-11-01", "count": 0},
    {"date": "2026-11-02", "count": 1},
  ]


def test_other_users_check_in_on_public_habit_does_not_count_for_author(
  client,
  auth_headers,
  other_user,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Extra: check-in de outra pessoa num hábito público não conta para o autor.
  freeze_today(TODAY)
  habit = habit_factory(is_public=True)
  goal_factory(habit)
  check_in_factory(habit, user=other_user, created_at=at_noon(TODAY))

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  data = response.json()
  assert data["check_ins"]["total"] == 0
  assert data["completed_habits"]["today"] == 0
  assert data["activity_streak"] == {"current": 0, "best": 0}
  [item] = data["habit_progress"]
  assert item["checked_today"] is False
  assert item["current_period"]["done"] == 0
