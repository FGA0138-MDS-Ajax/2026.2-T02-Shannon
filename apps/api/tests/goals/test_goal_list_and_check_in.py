from datetime import date

from app.goals.models import GoalPeriod
from tests.conftest import at_noon


def test_list_habits_includes_goal_and_progress(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Cria um hábito com meta diária e outro sem meta.
  habit_with_goal = habit_factory(name="Hábito com meta")
  habit_without_goal = habit_factory(name="Hábito sem meta")

  goal_factory(
    habit_with_goal,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Registra um check-in para concluir a meta no dia de referência.
  check_in_factory(
    habit_with_goal,
    created_at=at_noon(date(2026, 10, 28)),
  )

  freeze_today(date(2026, 10, 28))

  response = client.get(
    "/habits",
    headers=auth_headers,
  )

  assert response.status_code == 200

  habits = response.json()

  # Localiza os hábitos pelo nome para não depender da ordem da listagem.
  habit_with_goal_data = next(
    habit for habit in habits if habit["name"] == "Hábito com meta"
  )
  habit_without_goal_data = next(
    habit for habit in habits if habit["name"] == "Hábito sem meta"
  )

  assert habit_with_goal_data["goal"] is not None
  assert habit_with_goal_data["progress"]["status"] == "completed"

  assert habit_without_goal_data["goal"] is None
  assert habit_without_goal_data["progress"] is None


def test_create_check_in_returns_goal_progress(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
):
  # Cria um hábito com meta diária e outro sem meta.
  habit_with_goal = habit_factory(name="Hábito com meta")
  habit_without_goal = habit_factory(name="Hábito sem meta")

  goal_factory(
    habit_with_goal,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Cria um check-in para cada hábito pela API.
  goal_response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Check-in com meta",
      "habit_ids": [str(habit_with_goal.id)],
    },
  )

  no_goal_response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Check-in sem meta",
      "habit_ids": [str(habit_without_goal.id)],
    },
  )

  assert goal_response.status_code == 201
  assert no_goal_response.status_code == 201

  # O retorno deve incluir o progresso somente para o hábito com meta.
  goal_progress = goal_response.json()["progress"]

  assert len(goal_progress) == 1
  assert goal_progress[0]["habit_id"] == str(habit_with_goal.id)

  # O progresso da meta fica dentro da propriedade "progress".
  habit_progress = goal_progress[0]["progress"]

  assert habit_progress["current_period"]["done"] == 1
  assert habit_progress["status"] == "completed"

  # O hábito sem meta não deve aparecer no progresso.
  assert no_goal_response.json()["progress"] == []
