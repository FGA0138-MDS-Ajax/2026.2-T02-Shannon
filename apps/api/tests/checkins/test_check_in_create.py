from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth.models import User
from app.checkins.models import CheckIn, CheckInHabit
from app.habits.models import HabitCategory


def _count_rows(test_engine, model) -> int:
  """Conta os registros de uma tabela no banco de teste."""
  with Session(test_engine) as session:
    return session.exec(select(func.count()).select_from(model)).one()


def test_create_check_in_for_two_active_habits(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  test_engine,
):
  # Garante que um check-in seja salvo com seus dois hábitos e o título informado.
  habit_a = habit_factory(
    name="Musculação",
    category=HabitCategory.MUSCULACAO,
  )
  habit_b = habit_factory(
    name="Corrida",
    category=HabitCategory.CORRIDA,
  )

  response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Treino completo",
      "habit_ids": [str(habit_a.id), str(habit_b.id)],
    },
  )

  assert response.status_code == 201

  data = response.json()

  assert data["progress"] == []
  assert data["title"] == "Treino completo"
  assert set(data["habit_ids"]) == {
    str(habit_a.id),
    str(habit_b.id),
  }

  assert _count_rows(test_engine, CheckIn) == 1
  assert _count_rows(test_engine, CheckInHabit) == 2


def test_create_check_in_with_finished_habit_saves_nothing(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  test_engine,
):
  # Garante que um hábito encerrado recuse toda a operação sem gravar dados.
  active_habit = habit_factory(name="Corrida ativa")
  finished_habit = habit_factory(
    name="Musculação encerrada",
    finished=True,
  )

  response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Treino",
      "habit_ids": [
        str(active_habit.id),
        str(finished_habit.id),
      ],
    },
  )

  assert response.status_code == 409

  data = response.json()
  assert data["detail"] == "Hábito encerrado não aceita check-ins."
  assert set(data["habit_ids"]) == {str(finished_habit.id)}

  assert _count_rows(test_engine, CheckIn) == 0
  assert _count_rows(test_engine, CheckInHabit) == 0


def test_create_check_in_rejects_habits_from_other_users(
  client: TestClient,
  auth_headers: dict[str, str],
  other_user: User,
  habit_factory,
  test_engine,
):
  # Garante que hábitos privados e públicos de terceiros sejam recusados sem gravação.
  private_habit = habit_factory(
    author=other_user,
    name="Hábito privado",
  )
  public_habit = habit_factory(
    author=other_user,
    is_public=True,
    name="Hábito público",
  )

  private_response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Check-in privado",
      "habit_ids": [str(private_habit.id)],
    },
  )

  assert private_response.status_code == 404
  assert _count_rows(test_engine, CheckIn) == 0
  assert _count_rows(test_engine, CheckInHabit) == 0

  public_response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Check-in público",
      "habit_ids": [str(public_habit.id)],
    },
  )

  assert public_response.status_code == 403
  assert (
    public_response.json()["detail"]
    == "Apenas o autor pode fazer check-in neste hábito."
  )

  assert _count_rows(test_engine, CheckIn) == 0
  assert _count_rows(test_engine, CheckInHabit) == 0


def test_create_check_in_returns_updated_goal_progress(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
  freeze_today,
):
  """Garante que a resposta inclua o progresso atualizado da meta."""

  # Fixa a data para tornar o resultado previsível.
  freeze_today(date(2026, 10, 28))

  # Cria um hábito ativo e cadastra uma meta diária para ele.
  habit = habit_factory(name="Leitura")
  goal_factory(habit)

  # Cria um check-in para esse hábito.
  response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Leitura diária",
      "habit_ids": [str(habit.id)],
    },
  )

  # Confirma que o check-in foi criado com sucesso.
  assert response.status_code == 201

  data = response.json()

  # Confirma que a resposta identifica o hábito e inclui seu progresso.
  assert len(data["progress"]) == 1
  assert data["progress"][0]["habit_id"] == str(habit.id)

  progress = data["progress"][0]["progress"]

  # A meta diária deve contabilizar o check-in recém-criado.
  assert progress["current_period"]["done"] == 1
  assert progress["status"] == "completed"
