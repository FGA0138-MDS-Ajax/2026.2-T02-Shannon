from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth.models import User
from app.checkins.models import CheckIn, CheckInHabit
from app.goals.models import GoalPeriod
from app.habits.models import HabitCategory
from app.habits.service import today
from tests.conftest import at_noon


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


def _post_check_in(client: TestClient, headers: dict[str, str], habits) -> dict:
  """Faz o `POST /check-ins` com os hábitos dados e devolve o corpo do 201."""
  response = client.post(
    "/check-ins",
    headers=headers,
    json={"title": "Check-in", "habit_ids": [str(habit.id) for habit in habits]},
  )
  assert response.status_code == 201
  return response.json()


# O `POST /check-ins` grava com o `now()` real do banco, então estes testes usam o
# `today()` real em vez do `freeze_today`: um "hoje" congelado no passado deixaria o
# check-in recém-criado fora da conta.


def test_create_check_in_returns_updated_goal_progress(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
):
  # Garante que a meta diária já conte o check-in recém-criado.
  habit = habit_factory(name="Leitura")
  goal_factory(habit)

  data = _post_check_in(client, auth_headers, [habit])

  assert len(data["progress"]) == 1
  progress = data["progress"][0]
  assert progress["habit_id"] == str(habit.id)
  assert progress["goal"]["period"] == "day"
  assert progress["current_period"]["start"] == today().isoformat()
  assert progress["current_period"]["done"] == 1
  assert progress["status"] == "completed"
  assert progress["current_streak"] == 1


def test_create_check_in_progress_matches_goal_progress_endpoint(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
  check_in_factory,
):
  # Garante que o item de `progress` seja igual ao `GET /goals/habits/{id}/progress`.
  habit = habit_factory()
  goal_factory(habit, period=GoalPeriod.WEEK, target_count=3, period_end_weekday=7)
  check_in_factory(habit, created_at=at_noon(today() - timedelta(days=7)))

  data = _post_check_in(client, auth_headers, [habit])
  expected = client.get(f"/goals/habits/{habit.id}/progress", headers=auth_headers)

  assert data["progress"] == [expected.json()]


def test_create_check_in_progress_for_mixed_goals(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
):
  # Garante um item por hábito com meta; o hábito sem meta fica de fora.
  daily = habit_factory(name="Ler")
  weekly = habit_factory(name="Academia")
  without_goal = habit_factory(name="Hábito antigo")
  goal_factory(daily)
  goal_factory(weekly, period=GoalPeriod.WEEK, target_count=4, period_end_weekday=7)

  data = _post_check_in(client, auth_headers, [daily, weekly, without_goal])

  assert len(data["habit_ids"]) == 3
  progress = {item["habit_id"]: item for item in data["progress"]}
  assert set(progress) == {str(daily.id), str(weekly.id)}
  assert progress[str(daily.id)]["status"] == "completed"
  assert progress[str(weekly.id)]["current_period"]["done"] == 1
  assert progress[str(weekly.id)]["current_period"]["target_count"] == 4


def test_create_check_in_twice_on_same_day_counts_once(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
):
  # Garante que o segundo check-in do dia não some de novo nem mude o streak.
  habit = habit_factory()
  goal_factory(habit)

  first = _post_check_in(client, auth_headers, [habit])["progress"][0]
  second = _post_check_in(client, auth_headers, [habit])["progress"][0]

  assert second["current_period"]["done"] == 1
  assert second["current_streak"] == first["current_streak"] == 1


def test_create_check_in_progress_extends_streak(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
  check_in_factory,
):
  # Garante que o histórico conte e que o check-in de hoje estenda a sequência.
  habit = habit_factory()
  goal_factory(habit)
  check_in_factory(habit, created_at=at_noon(today() - timedelta(days=1)))
  check_in_factory(habit, created_at=at_noon(today() - timedelta(days=2)))

  progress = _post_check_in(client, auth_headers, [habit])["progress"][0]

  assert progress["current_streak"] == 3
  assert progress["streak_started_on"] == (today() - timedelta(days=2)).isoformat()


def test_create_check_in_progress_ignores_other_users_check_ins(
  client: TestClient,
  auth_headers: dict[str, str],
  other_user: User,
  habit_factory,
  goal_factory,
  check_in_factory,
):
  # Garante que só os check-ins do autor contem para a meta.
  habit = habit_factory(is_public=True)
  goal_factory(habit)
  check_in_factory(
    habit, user=other_user, created_at=at_noon(today() - timedelta(days=1))
  )

  progress = _post_check_in(client, auth_headers, [habit])["progress"][0]

  assert progress["current_streak"] == 1


def test_create_check_in_with_finished_habit_with_goal_saves_nothing(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  goal_factory,
  test_engine,
):
  # Garante que a recusa continue igual quando os hábitos têm meta.
  active_habit = habit_factory()
  finished_habit = habit_factory(finished=True)
  goal_factory(active_habit)
  goal_factory(finished_habit)

  response = client.post(
    "/check-ins",
    headers=auth_headers,
    json={
      "title": "Treino",
      "habit_ids": [str(active_habit.id), str(finished_habit.id)],
    },
  )

  assert response.status_code == 409
  assert "progress" not in response.json()
  assert _count_rows(test_engine, CheckIn) == 0
  assert _count_rows(test_engine, CheckInHabit) == 0
