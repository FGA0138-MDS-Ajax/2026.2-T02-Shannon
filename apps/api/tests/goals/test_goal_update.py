from datetime import date

from app.goals.models import GoalPeriod
from tests.conftest import at_noon


def test_update_goal_preserves_start_date_when_goal_is_unchanged(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria um hábito com meta diária e registra seu início.
  habit = habit_factory()
  goal = goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )
  original_start_date = goal.starts_on

  # Registra check-ins anteriores à atualização.
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 26)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 27)))

  freeze_today(date(2026, 10, 28))

  response = client.put(
    f"/goals/habits/{habit.id}/goal",
    headers=auth_headers,
    json={
      "period": "day",
      "target_count": 1,
    },
  )

  assert response.status_code == 200
  assert response.json()["starts_on"] == original_start_date.isoformat()


def test_update_goal_resets_progress_when_period_changes(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria uma meta diária e registra check-ins antes da alteração.
  habit = habit_factory()
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 26)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 27)))

  freeze_today(date(2026, 10, 28))

  response = client.put(
    f"/goals/habits/{habit.id}/goal",
    headers=auth_headers,
    json={
      "period": "month",
      "target_count": 3,
    },
  )

  assert response.status_code == 200
  assert response.json()["starts_on"] == "2026-10-28"

  # Consulta o progresso depois da alteração.
  progress_response = client.get(
    f"/goals/habits/{habit.id}/progress",
    headers=auth_headers,
  )

  assert progress_response.status_code == 200
  assert progress_response.json()["current_streak"] == 0


def test_update_goal_rejects_finished_habit(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
):
  # Cria um hábito já finalizado.
  habit = habit_factory(
    finished=True,
    finished_at=date(2026, 10, 27),
  )
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  response = client.put(
    f"/goals/habits/{habit.id}/goal",
    headers=auth_headers,
    json={
      "period": "month",
      "target_count": 3,
    },
  )

  assert response.status_code == 409


def test_update_goal_rejects_another_users_public_habit(
  client,
  auth_headers,
  other_user,
  habit_factory,
  goal_factory,
):
  # Cria um hábito público pertencente a outro usuário.
  habit = habit_factory(
    author=other_user,
    is_public=True,
  )
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Tenta alterar a meta usando a autenticação do usuário principal.
  response = client.put(
    f"/goals/habits/{habit.id}/goal",
    headers=auth_headers,
    json={
      "period": "month",
      "target_count": 3,
    },
  )

  assert response.status_code == 403
