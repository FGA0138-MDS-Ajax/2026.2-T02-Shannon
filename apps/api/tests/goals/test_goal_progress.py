from datetime import date, datetime

from app.goals.models import GoalPeriod
from app.habits.service import APP_TIMEZONE
from tests.conftest import at_noon


def test_weekly_streak_counts_consecutive_completed_weeks(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Garante que duas semanas completas formam um streak de duas semanas.
  freeze_today(date(2026, 10, 27))

  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.WEEK,
    target_count=4,
    period_end_weekday=7,
  )

  check_in_dates = [
    date(2026, 10, 12),
    date(2026, 10, 13),
    date(2026, 10, 15),
    date(2026, 10, 17),
    date(2026, 10, 19),
    date(2026, 10, 21),
    date(2026, 10, 23),
    date(2026, 10, 25),
    date(2026, 10, 27),
  ]

  for day in check_in_dates:
    check_in_factory(habit, created_at=at_noon(day))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["current_streak"] == 2
  assert data["status"] == "in_progress"
  assert data["current_period"]["start"] == "2026-10-26"
  assert data["current_period"]["end"] == "2026-11-01"
  assert data["current_period"]["done"] == 1
  assert data["current_period"]["target_count"] == 4
  assert data["streak_started_on"] == "2026-10-12"


def test_weekly_streak_resets_after_missed_week(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Garante que uma semana não cumprida interrompe o streak após seu encerramento.
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.WEEK,
    target_count=4,
    period_end_weekday=7,
  )

  check_in_dates = [
    date(2026, 10, 19),
    date(2026, 10, 21),
    date(2026, 10, 23),
    date(2026, 10, 25),
    date(2026, 10, 26),
    date(2026, 10, 27),
    date(2026, 10, 28),
  ]

  for day in check_in_dates:
    check_in_factory(habit, created_at=at_noon(day))

  # Em 01/11, a semana atual ainda não terminou.
  freeze_today(date(2026, 11, 1))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200
  data = response.json()

  assert data["current_streak"] == 1
  assert data["status"] == "at_risk"

  # Em 02/11, a semana anterior terminou sem cumprir a meta.
  freeze_today(date(2026, 11, 2))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200
  data = response.json()

  assert data["current_streak"] == 0
  assert data["streak_started_on"] is None
  assert data["best_streak"] == 1


def test_weekly_goal_counts_check_ins_using_sao_paulo_timezone(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria um hábito com meta de quatro check-ins por semana.
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.WEEK,
    target_count=4,
    period_end_weekday=7,
  )

  # Os três horários representam o mesmo dia em São Paulo.
  check_in_times = [
    datetime(2026, 10, 26, 8, 0, tzinfo=APP_TIMEZONE),
    datetime(2026, 10, 26, 18, 0, tzinfo=APP_TIMEZONE),
    datetime(2026, 10, 26, 23, 30, tzinfo=APP_TIMEZONE),
  ]

  for created_at in check_in_times:
    check_in_factory(habit, created_at=created_at)

  # Define a data de referência para consultar o progresso.
  freeze_today(date(2026, 10, 27))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  # Mesmo com três check-ins, apenas um dia deve ser contabilizado.
  assert data["current_period"]["done"] == 1


def test_daily_streak_enters_at_risk_before_resetting(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria um hábito com meta de um check-in por dia.
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Registra três dias consecutivos de check-in.
  check_in_dates = [
    date(2026, 10, 20),
    date(2026, 10, 21),
    date(2026, 10, 22),
  ]

  for day in check_in_dates:
    check_in_factory(habit, created_at=at_noon(day))

  # No dia 23, a meta ainda pode ser cumprida.
  freeze_today(date(2026, 10, 23))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["current_streak"] == 3
  assert data["status"] == "at_risk"
  assert data["consistent_days"] == 4

  # No dia 24, a ausência de check-in no dia anterior interrompe a sequência.
  freeze_today(date(2026, 10, 24))

  response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["current_streak"] == 0


def test_deleting_check_in_recalculates_daily_streak(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria um hábito com meta diária.
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Registra três dias consecutivos de check-in.
  check_in_dates = [
    date(2026, 10, 26),
    date(2026, 10, 27),
    date(2026, 10, 28),
  ]

  check_ins = [
    check_in_factory(habit, created_at=at_noon(day)) for day in check_in_dates
  ]

  freeze_today(date(2026, 10, 28))

  # Confirma o streak antes da exclusão.
  response_before = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response_before.status_code == 200
  assert response_before.json()["current_streak"] == 3

  # Exclui o check-in do dia 27.
  delete_response = client.delete(
    f"/check-ins/{check_ins[1].id}",
    headers=auth_headers,
  )

  assert delete_response.status_code == 204

  # Consulta novamente o progresso após a exclusão.
  response_after = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert response_after.status_code == 200

  data = response_after.json()

  assert data["current_streak"] == 1
  assert data["best_streak"] == 1


def test_goal_progress_respects_habit_visibility_and_goal_existence(
  client,
  auth_headers,
  user,
  other_user,
  habit_factory,
  goal_factory,
  check_in_factory,
):
  # Cria um hábito privado pertencente a outro usuário.
  private_habit = habit_factory(author=other_user)

  private_response = client.get(
    f"/goals/habits/{private_habit.id}/progress",
    headers=auth_headers,
  )

  assert private_response.status_code == 404
  assert private_response.json()["detail"] == "Hábito não encontrado."

  # Cria um hábito público de outro usuário, com meta e check-in.
  public_habit = habit_factory(
    author=other_user,
    is_public=True,
  )
  goal_factory(
    public_habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )
  check_in_factory(public_habit, user=other_user)

  public_response = client.get(
    f"/goals/habits/{public_habit.id}/progress",
    headers=auth_headers,
  )

  assert public_response.status_code == 200
  assert public_response.json()["current_streak"] >= 1

  # Cria um hábito próprio sem meta.
  habit_without_goal = habit_factory()

  no_goal_response = client.get(
    f"/goals/habits/{habit_without_goal.id}/progress",
    headers=auth_headers,
  )

  assert no_goal_response.status_code == 404
  assert no_goal_response.json()["detail"] == "Este hábito ainda não tem meta."
