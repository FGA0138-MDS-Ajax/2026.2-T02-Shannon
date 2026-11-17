from datetime import date

from fastapi.testclient import TestClient

from app.habits.exceptions import MSG_GROUP_HABIT_FORBIDDEN
from tests.conftest import at_noon
from tests.group.fixtures import TODAY


def test_existing_routes_with_a_personal_and_a_group_habit(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  habit_factory,
  goal_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  check_in_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  personal = habit_factory(name="Pessoal")
  goal_factory(personal)
  check_in_factory(personal, created_at=at_noon(date(2026, 11, 10)))

  group = group_factory(admin=other_user)
  group_habit = group_habit_factory(group, name="Do grupo")
  check_in_factory(group_habit, user=other_user, created_at=at_noon(date(2026, 11, 9)))
  statistics_before = client.get("/user/statistics", headers=auth_headers).json()

  member_factory(group, user)

  listed = {h["name"]: h for h in client.get("/habits", headers=auth_headers).json()}
  assert set(listed) == {"Pessoal", "Do grupo"}
  assert listed["Pessoal"]["group"] is None
  assert listed["Do grupo"]["group"] == {"id": str(group.id), "name": "Grupo Teste"}
  assert listed["Do grupo"]["progress"]["current_streak"] == 0  # o check-in é do colega
  filtered = client.get("/habits?status=active", headers=auth_headers).json()
  assert len(filtered) == 2
  assert (
    client.get(f"/habits/{group_habit.id}", headers=auth_headers).status_code == 200
  )

  url = f"/habits/{group_habit.id}"
  responses = [
    client.patch(url, json={"name": "Novo"}, headers=auth_headers),
    client.post(f"{url}/finish", headers=auth_headers),
    client.delete(url, headers=auth_headers),
  ]
  for response in responses:
    assert response.status_code == 403
    assert response.json()["detail"] == MSG_GROUP_HABIT_FORBIDDEN

  history = client.get(f"/habits/{group_habit.id}/check-ins", headers=auth_headers)
  assert [c["user_id"] for c in history.json()] == [str(other_user.id)]

  assert (
    client.get("/user/statistics", headers=auth_headers).json() == statistics_before
  )

  assert (
    client.post(f"/groups/{group.id}/leave", headers=auth_headers).status_code == 200
  )
  assert client.get(url, headers=auth_headers).status_code == 404
  names = [h["name"] for h in client.get("/habits", headers=auth_headers).json()]
  assert names == ["Pessoal"]
  assert (
    client.get("/user/statistics", headers=auth_headers).json() == statistics_before
  )
