from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlmodel import Session, select

from app.checkins.models import CheckIn, CheckInHabit
from app.habits.models import Habit


def _count_rows(test_engine, model) -> int:
  """Conta os registros de uma tabela no banco de teste."""
  with Session(test_engine) as session:
    return session.exec(select(func.count()).select_from(model)).one()


def test_delete_habit_preserves_check_in_for_other_habits(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
  test_engine,
):
  # Garante que excluir um hábito remova apenas seu vínculo com o check-in.
  habit_a = habit_factory(name="Corrida")
  habit_b = habit_factory(name="Musculação")

  check_in = check_in_factory(
    [habit_a, habit_b],
    title="Treino combinado",
  )

  response = client.delete(
    f"/habits/{habit_a.id}",
    headers=auth_headers,
  )

  assert response.status_code == 204
  assert response.content == b""

  with Session(test_engine) as session:
    saved_check_in = session.get(CheckIn, check_in.id)
    assert saved_check_in is not None
    assert saved_check_in.title == "Treino combinado"

    links = session.exec(
      select(CheckInHabit).where(
        CheckInHabit.check_in_id == check_in.id,
      )
    ).all()

    assert {link.habit_id for link in links} == {habit_b.id}

    assert session.get(Habit, habit_a.id) is None
    assert session.get(Habit, habit_b.id) is not None


def test_create_habit_validates_and_normalizes_category(
  client: TestClient,
  auth_headers: dict[str, str],
  test_engine,
):
  # Garante que a categoria seja obrigatória, validada e normalizada na criação.
  base_payload = {"name": "Hábito de teste", "goal": {"period": "day"}}

  missing_category_response = client.post(
    "/habits",
    headers=auth_headers,
    json=base_payload,
  )

  assert missing_category_response.status_code == 422
  assert _count_rows(test_engine, Habit) == 0

  empty_category_response = client.post(
    "/habits",
    headers=auth_headers,
    json={**base_payload, "category": ""},
  )

  assert empty_category_response.status_code == 422
  assert _count_rows(test_engine, Habit) == 0

  normalized_category_response = client.post(
    "/habits",
    headers=auth_headers,
    json={**base_payload, "category": " Musculacao "},
  )

  assert normalized_category_response.status_code == 201
  assert normalized_category_response.json()["category"] == "musculacao"
  assert _count_rows(test_engine, Habit) == 1

  invalid_category_response = client.post(
    "/habits",
    headers=auth_headers,
    json={**base_payload, "category": "futebol"},
  )

  assert invalid_category_response.status_code == 422
  assert _count_rows(test_engine, Habit) == 1
