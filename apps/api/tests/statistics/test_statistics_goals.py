from datetime import date

import pytest

from app.goals.models import GoalPeriod
from tests.conftest import at_noon

WEEKLY_DAYS = [
  date(2026, 10, 12),
  date(2026, 10, 13),
  date(2026, 10, 15),
  date(2026, 10, 17),
  date(2026, 10, 19),
  date(2026, 10, 21),
  date(2026, 10, 23),
  date(2026, 10, 25),
]


@pytest.fixture
def weekly_habit(habit_factory, goal_factory, check_in_factory):
  """Fábrica: semanal 4x fechando no domingo, com duas semanas cumpridas."""

  def create(starts_on=date(2026, 10, 12), extra_days=()):
    habit = habit_factory(name="Correr")
    goal_factory(
      habit,
      period=GoalPeriod.WEEK,
      target_count=4,
      period_end_weekday=7,
      starts_on=starts_on,
    )
    for day in [*WEEKLY_DAYS, *extra_days]:
      check_in_factory(habit, created_at=at_noon(day))
    return habit

  return create


@pytest.mark.parametrize(
  ("mode", "expected"),
  [
    ("calendar", {"today": 0, "week": 0, "month": 1}),
    ("rolling", {"today": 0, "week": 1, "month": 1}),
  ],
)
def test_completed_habits_counts_each_habit_once_per_window(
  client, auth_headers, weekly_habit, freeze_today, mode, expected
):
  # Garante que o hábito conta pela data em que bateu a meta, uma vez por janela.
  freeze_today(date(2026, 10, 27))
  weekly_habit()

  response = client.get("/user/statistics", headers=auth_headers, params={"mode": mode})

  assert response.status_code == 200
  assert response.json()["completed_habits"] == expected


@pytest.mark.parametrize(
  ("today", "completed", "total", "rate"),
  [
    (date(2026, 11, 1), 2, 2, 100.0),
    (date(2026, 11, 2), 2, 3, 66.7),
  ],
)
def test_goal_completion_ignores_open_period_until_it_closes(
  client, auth_headers, weekly_habit, freeze_today, today, completed, total, rate
):
  # Garante que a semana aberta e não cumprida só entra na taxa quando fecha.
  freeze_today(today)
  habit = weekly_habit(extra_days=[date(2026, 10, 27)])

  response = client.get("/user/statistics", headers=auth_headers, params={"days": 30})

  assert response.status_code == 200
  data = response.json()
  expected = {
    "completed_periods": completed,
    "total_periods": total,
    "rate": pytest.approx(rate),
  }
  assert data["goal_completion"] == {**expected, "days": 30}
  [item] = data["habit_progress"]
  assert item["habit_id"] == str(habit.id)
  assert item["consistency"] == expected


def test_goal_completion_skips_unmet_first_partial_period(
  client, auth_headers, weekly_habit, freeze_today
):
  # Garante que a semana em que a meta começou no meio não conta se não cumprida.
  freeze_today(date(2026, 11, 1))
  weekly_habit(starts_on=date(2026, 10, 14), extra_days=[date(2026, 10, 27)])

  response = client.get("/user/statistics", headers=auth_headers, params={"days": 30})

  assert response.status_code == 200
  data = response.json()
  assert data["goal_completion"]["completed_periods"] == 1
  assert data["goal_completion"]["total_periods"] == 1
  assert data["goal_completion"]["rate"] == pytest.approx(100.0)


def test_goal_completion_counts_finished_habit_until_finished_at(
  client, auth_headers, habit_factory, goal_factory, check_in_factory, freeze_today
):
  # Garante que o encerrado entra na taxa só até o fim e sai do painel diário.
  freeze_today(date(2026, 10, 20))
  habit = habit_factory(finished=True, finished_at=date(2026, 10, 11))
  goal_factory(habit)
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 10)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 11)))

  response = client.get("/user/statistics", headers=auth_headers, params={"days": 16})

  assert response.status_code == 200
  data = response.json()
  assert data["goal_completion"]["completed_periods"] == 2
  assert data["goal_completion"]["total_periods"] == 7
  assert data["goal_completion"]["rate"] == pytest.approx(28.6)
  assert data["habit_progress"] == []


def test_habit_progress_lists_active_goals_by_streak_then_name(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Garante o painel diário: só ativos com meta, ordem e hábitos em risco.
  freeze_today(date(2026, 10, 30))

  daily = habit_factory(name="Beber água")
  goal_factory(daily)

  weekly = habit_factory(name="Correr")
  goal_factory(weekly, period=GoalPeriod.WEEK, target_count=4, period_end_weekday=7)
  for day in [date(2026, 10, 26), date(2026, 10, 30)]:
    check_in_factory(weekly, created_at=at_noon(day))

  monthly = habit_factory(name="Ler")
  goal_factory(monthly, period=GoalPeriod.MONTH, target_count=3)
  for day in [1, 2, 3, 28]:
    check_in_factory(monthly, created_at=at_noon(date(2026, 10, day)))

  finished = habit_factory(name="Antigo encerrado", finished=True)
  goal_factory(finished)
  habit_factory(name="Sem meta")

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  data = response.json()
  assert data["habits"] == {"total": 5, "active": 4, "finished": 1}

  items = data["habit_progress"]
  assert [item["habit_id"] for item in items] == [
    str(monthly.id),
    str(daily.id),
    str(weekly.id),
  ]
  monthly_item, daily_item, weekly_item = items
  assert monthly_item["current_streak"] == 1
  assert monthly_item["status"] == "completed"
  assert daily_item["status"] == "at_risk"
  assert daily_item["checked_today"] is False
  assert weekly_item["status"] == "at_risk"
  assert weekly_item["checked_today"] is True

  assert data["at_risk"]["count"] == 2
  assert set(data["at_risk"]["habit_ids"]) == {str(daily.id), str(weekly.id)}


@pytest.mark.parametrize(
  ("mode", "expected"),
  [
    ("calendar", {"today": 0, "week": 1, "month": 0}),
    ("rolling", {"today": 0, "week": 1, "month": 1}),
  ],
)
def test_monthly_goal_on_month_turn(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
  mode,
  expected,
):
  # Extra: na virada do mês, outubro fechado entra na taxa e o mês novo zera.
  freeze_today(date(2026, 11, 1))
  habit = habit_factory()
  goal_factory(habit, period=GoalPeriod.MONTH, target_count=2)
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 30)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 31)))

  response = client.get("/user/statistics", headers=auth_headers, params={"mode": mode})

  assert response.status_code == 200
  data = response.json()
  assert data["completed_habits"] == expected
  assert data["goal_completion"]["completed_periods"] == 1
  assert data["goal_completion"]["total_periods"] == 1
  assert data["goal_completion"]["rate"] == pytest.approx(100.0)
