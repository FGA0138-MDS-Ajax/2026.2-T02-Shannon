"""GRP-10: `GroupHabitPublic` continua com um único `group` preenchido."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

from tests.group.test_group_habits import WEEKLY_GOAL, group_setup  # noqa: F401


def _assert_shape(item: dict, group_id: str) -> None:
  assert item["group"] == {"id": group_id, "name": "Grupo Teste"}
  assert item["author_user_id"] is None
  assert item["author_group_id"] == group_id


def test_group_habit_routes_return_single_filled_group(
  client: TestClient,
  group_setup: SimpleNamespace,  # noqa: F811
) -> None:
  group_id = str(group_setup.group.id)
  base = f"/groups/{group_id}/habits"
  headers = group_setup.admin_headers

  created = client.post(
    base,
    json={"name": "Correr", "category": "corrida", "goal": WEEKLY_GOAL},
    headers=headers,
  )
  assert created.status_code == 201, created.text
  habit_id = created.json()["id"]

  responses = {
    "create": created,
    "detail": client.get(f"{base}/{habit_id}", headers=headers),
    "update": client.patch(
      f"{base}/{habit_id}", json={"name": "Nadar"}, headers=headers
    ),
    "finish": client.post(f"{base}/{habit_id}/finish", headers=headers),
  }
  for name, response in responses.items():
    assert response.status_code in (200, 201), (name, response.text)
    assert response.text.count('"group":') == 1, name
    _assert_shape(response.json(), group_id)

  listed = client.get(base, headers=headers)
  assert listed.status_code == 200
  assert listed.text.count('"group":') == len(listed.json()) == 1
  _assert_shape(listed.json()[0], group_id)
