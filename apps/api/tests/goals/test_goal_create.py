from datetime import date

from sqlmodel import Session, select

from app.habits.models import Habit


def count_habits(test_engine) -> int:
  """Conta os hábitos gravados para verificar se houve persistência indevida."""
  with Session(test_engine) as session:
    return len(session.exec(select(Habit)).all())


def test_create_habit_without_goal_returns_422(client, auth_headers, test_engine):
  # Garante que a API exige uma meta para criar um hábito.
  response = client.post(
    "/habits",
    headers=auth_headers,
    json={
      "name": "Correr",
      "category": "corrida",
    },
  )

  assert response.status_code == 422
  assert count_habits(test_engine) == 0


def test_create_habit_with_daily_goal(client, auth_headers, test_engine, freeze_today):
  # Garante que uma meta diária recebe target_count 1 e começa hoje.
  today = date(2026, 10, 28)
  freeze_today(today)

  response = client.post(
    "/habits",
    headers=auth_headers,
    json={
      "name": "Estudar",
      "category": "estudos",
      "goal": {
        "period": "day",
      },
    },
  )

  assert response.status_code == 201
  data = response.json()

  assert data["goal"]["period"] == "day"
  assert data["goal"]["target_count"] == 1
  assert data["goal"]["starts_on"] == today.isoformat()
  assert count_habits(test_engine) == 1


def test_create_habit_with_weekly_goal(client, auth_headers):
  # Garante que a meta semanal mantém a quantidade e o domingo como encerramento.
  response = client.post(
    "/habits",
    headers=auth_headers,
    json={
      "name": "Treinar",
      "category": "musculacao",
      "goal": {
        "period": "week",
        "target_count": 4,
        "period_end_weekday": 7,
      },
    },
  )

  assert response.status_code == 201
  data = response.json()

  assert data["goal"]["period"] == "week"
  assert data["goal"]["target_count"] == 4
  assert data["goal"]["period_end_weekday"] == 7


def test_create_habit_with_invalid_goal_returns_422(client, auth_headers, test_engine):
  # Garante que configurações inválidas não criam hábitos no banco.
  invalid_goals = [
    {"period": "week", "target_count": 4},
    {"period": "month"},
    {"period": "year"},
  ]

  for goal in invalid_goals:
    response = client.post(
      "/habits",
      headers=auth_headers,
      json={
        "name": "Hábito inválido",
        "category": "outros",
        "goal": goal,
      },
    )

    assert response.status_code == 422
    assert count_habits(test_engine) == 0
