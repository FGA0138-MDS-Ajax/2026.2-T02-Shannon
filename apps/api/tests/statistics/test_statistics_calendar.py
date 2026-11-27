from datetime import date

import pytest

from app.goals.models import GoalPeriod
from tests.conftest import at_noon


def _states(response) -> dict[int, str]:
  """Estado de cada dia do calendário, pelo número do dia."""
  return {date.fromisoformat(d["date"]).day: d["state"] for d in response["days"]}


@pytest.fixture
def weekly_habit(habit_factory, goal_factory, check_in_factory):
  """Semanal 4x fechando no domingo: semana de 12/10 cumprida, a de 19/10 não."""
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.WEEK,
    target_count=4,
    period_end_weekday=7,
    starts_on=date(2026, 10, 12),
  )
  for day in [12, 13, 15, 17, 19, 21, 23, 27]:
    check_in_factory(habit, created_at=at_noon(date(2026, 10, day)))
  return habit


def test_calendar_marks_each_day_state(
  client, auth_headers, weekly_habit, freeze_today
):
  # Garante os quatro estados do mês: fora, cumprido, parcial e sem check-in.
  freeze_today(date(2026, 10, 28))

  response = client.get(
    f"/user/statistics/habits/{weekly_habit.id}/calendar",
    headers=auth_headers,
    params={"month": "2026-10"},
  )

  assert response.status_code == 200
  data = response.json()
  assert data["habit_id"] == str(weekly_habit.id)
  assert data["month"] == "2026-10"
  assert data["period"] == "week"
  assert data["target_count"] == 4
  assert [d["date"] for d in data["days"]] == [
    date(2026, 10, day).isoformat() for day in range(1, 32)
  ]

  outside = {*range(1, 12), 29, 30, 31}
  completed = {12, 13, 15, 17}
  partial = {19, 21, 23, 27}
  expected = {
    day: "outside"
    if day in outside
    else "completed"
    if day in completed
    else "partial"
    if day in partial
    else "none"
    for day in range(1, 32)
  }
  assert _states(data) == expected


@pytest.mark.parametrize(
  "month", ["2026-13", "10-2026", "2026-10\n", "0000-05", "9999-12"]
)
def test_calendar_rejects_invalid_month(
  client, auth_headers, weekly_habit, freeze_today, month
):
  # Garante 422 com a mensagem, e não 500, para mês fora do formato ou da faixa.
  freeze_today(date(2026, 10, 28))

  response = client.get(
    f"/user/statistics/habits/{weekly_habit.id}/calendar",
    headers=auth_headers,
    params={"month": month},
  )

  assert response.status_code == 422
  [error] = response.json()["detail"]
  assert error["msg"] == "Value error, Informe o mês no formato AAAA-MM."


def test_calendar_hides_other_users_public_habit(
  client, auth_headers, other_user, habit_factory, goal_factory, freeze_today
):
  # Garante que o calendário é só do autor, mesmo para hábito público.
  freeze_today(date(2026, 10, 28))
  habit = habit_factory(author=other_user, is_public=True)
  goal_factory(habit)

  response = client.get(
    f"/user/statistics/habits/{habit.id}/calendar", headers=auth_headers
  )

  assert response.status_code == 404
  assert response.json()["detail"] == "Hábito não encontrado."


def test_calendar_requires_goal(client, auth_headers, habit_factory, freeze_today):
  # Garante 404 para hábito antigo, criado antes das metas.
  freeze_today(date(2026, 10, 28))
  habit = habit_factory()

  response = client.get(
    f"/user/statistics/habits/{habit.id}/calendar", headers=auth_headers
  )

  assert response.status_code == 404
  assert response.json()["detail"] == "Este hábito ainda não tem meta."


@pytest.mark.parametrize(
  ("month", "expected"),
  [
    ("2026-10", {day: "completed" if day >= 30 else "none" for day in range(1, 32)}),
    (None, {day: "none" if day == 1 else "outside" for day in range(1, 31)}),
  ],
)
def test_calendar_monthly_goal_on_month_turn(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
  month,
  expected,
):
  # Extra: na virada do mês, outubro fica cumprido e novembro começa vazio.
  freeze_today(date(2026, 11, 1))
  habit = habit_factory()
  goal_factory(habit, period=GoalPeriod.MONTH, target_count=2)
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 30)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 31)))

  params = {"month": month} if month else {}
  response = client.get(
    f"/user/statistics/habits/{habit.id}/calendar",
    headers=auth_headers,
    params=params,
  )

  assert response.status_code == 200
  assert _states(response.json()) == expected


@pytest.mark.parametrize(
  ("month", "completed_day", "last_day"),
  [("2026-10", 30, 31), ("2026-11", 2, 30)],
)
def test_calendar_week_closing_on_wednesday_crosses_months(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
  month,
  completed_day,
  last_day,
):
  # Extra: a semana de 29/10 a 04/11 cumprida aparece completa nos dois meses.
  freeze_today(date(2026, 11, 5))
  habit = habit_factory()
  goal_factory(habit, period=GoalPeriod.WEEK, target_count=2, period_end_weekday=3)
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 30)))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 2)))

  response = client.get(
    f"/user/statistics/habits/{habit.id}/calendar",
    headers=auth_headers,
    params={"month": month},
  )

  assert response.status_code == 200
  states = _states(response.json())
  assert len(states) == last_day
  assert states[completed_day] == "completed"
  assert "partial" not in states.values()
