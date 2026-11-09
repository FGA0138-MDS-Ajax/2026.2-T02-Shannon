from fastapi.testclient import TestClient

from app.auth.models import User
from app.habits.models import HabitCategory


def test_check_in_only_exposes_visible_habits_to_other_users(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  other_auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
):
  # Garante que outro usuário veja somente os hábitos públicos do check-in.
  public_habit = habit_factory(
    name="Corrida pública",
    category=HabitCategory.CORRIDA,
    is_public=True,
  )
  private_habit = habit_factory(
    name="Hábito privado",
    category=HabitCategory.MUSCULACAO,
  )

  check_in = check_in_factory(
    [public_habit, private_habit],
    user=user,
    title="Treino com dois hábitos",
  )

  owner_response = client.get(
    f"/check-ins/{check_in.id}",
    headers=auth_headers,
  )

  assert owner_response.status_code == 200
  assert set(owner_response.json()["habit_ids"]) == {
    str(public_habit.id),
    str(private_habit.id),
  }

  other_response = client.get(
    f"/check-ins/{check_in.id}",
    headers=other_auth_headers,
  )

  assert other_response.status_code == 200
  assert set(other_response.json()["habit_ids"]) == {
    str(public_habit.id),
  }

  history_response = client.get(
    f"/habits/{public_habit.id}/check-ins",
    headers=other_auth_headers,
  )

  print("Owner:", owner_response.status_code, owner_response.text)
  print("Other:", other_response.status_code, other_response.text)
  print("History:", history_response.status_code, history_response.text)

  assert history_response.status_code == 200

  history = history_response.json()
  assert len(history) == 1
  assert history[0]["id"] == str(check_in.id)
  assert set(history[0]["habit_ids"]) == {
    str(public_habit.id),
  }
