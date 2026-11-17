from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.group.exceptions import MSG_GROUP_FORBIDDEN, MSG_GROUP_NOT_FOUND
from app.group.models import GroupRole
from tests.group.fixtures import TODAY

GROUP_BODY = {"name": "Corredores", "ranking_criterion": "check_ins"}


def test_group_routes_require_token(client: TestClient) -> None:
  group_id = uuid4()

  responses = [
    client.post("/groups", json=GROUP_BODY),
    client.get("/groups"),
    client.get(f"/groups/{group_id}"),
    client.post("/groups/join", json={"code": "ABCD2345"}),
    client.get(f"/groups/{group_id}/ranking"),
  ]

  assert [response.status_code for response in responses] == [401] * 5


def test_create_group_defaults_and_invalid_bodies(
  client: TestClient, user, auth_headers, freeze_today
) -> None:
  freeze_today(TODAY)

  created = client.post("/groups", json=GROUP_BODY, headers=auth_headers)

  assert created.status_code == 201
  body = created.json()
  assert body["starts_on"] == TODAY.isoformat()
  assert body["ends_on"] is None
  assert body["my_role"] == GroupRole.ADMIN
  assert body["status"] == "active"
  assert len(body["invite_code"]) == 8
  assert [m["user_id"] for m in body["members"]] == [str(user.id)]

  invalid_bodies = [
    {**GROUP_BODY, "starts_on": "2026-11-11", "ends_on": "2026-11-10"},
    {**GROUP_BODY, "ranking_criterion": "pontos"},
    {**GROUP_BODY, "name": ""},
  ]
  for invalid in invalid_bodies:
    response = client.post("/groups", json=invalid, headers=auth_headers)
    assert response.status_code == 422, invalid


def test_each_user_only_sees_own_group(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  other_auth_headers,
  group_factory,
  member_factory,
) -> None:
  mine = group_factory(admin=user, name="Do usuário")
  theirs = group_factory(admin=other_user, name="Do outro")
  member_factory(mine, other_user)  # membro comum no grupo do `user`

  my_list = client.get("/groups", headers=auth_headers).json()
  their_list = client.get("/groups", headers=other_auth_headers).json()
  assert [g["id"] for g in my_list] == [str(mine.id)]
  assert {g["id"] for g in their_list} == {str(mine.id), str(theirs.id)}

  foreign = client.get(f"/groups/{theirs.id}", headers=auth_headers)
  assert foreign.status_code == 404
  assert foreign.json()["detail"] == MSG_GROUP_NOT_FOUND

  as_admin = client.get(f"/groups/{mine.id}", headers=auth_headers).json()
  as_member = client.get(f"/groups/{mine.id}", headers=other_auth_headers).json()
  assert len(as_admin["invite_code"]) == 8
  assert as_member["invite_code"] is None


def test_group_end_date_lifecycle(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  other_auth_headers,
  group_factory,
  member_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user, ends_on=TODAY - timedelta(days=1))
  member_factory(group, other_user)
  url = f"/groups/{group.id}"

  def listed_status() -> str:
    return client.get("/groups", headers=auth_headers).json()[0]["status"]

  assert listed_status() == "ended"

  extended = TODAY + timedelta(days=7)
  response = client.patch(
    url, json={"ends_on": extended.isoformat()}, headers=auth_headers
  )
  assert response.status_code == 200
  assert response.json()["ends_on"] == extended.isoformat()
  assert listed_status() == "active"

  response = client.patch(url, json={"ends_on": None}, headers=auth_headers)
  assert response.status_code == 200
  assert response.json()["ends_on"] is None

  past = (TODAY - timedelta(days=1)).isoformat()
  response = client.patch(url, json={"ends_on": past}, headers=auth_headers)
  assert response.status_code == 422

  response = client.patch(
    url, json={"ranking_criterion": "goals"}, headers=auth_headers
  )
  assert response.status_code == 200
  assert client.get(url, headers=auth_headers).json()["ranking_criterion"] == "goals"

  response = client.patch(url, json={"name": "X"}, headers=other_auth_headers)
  assert response.status_code == 403
  assert response.json()["detail"] == MSG_GROUP_FORBIDDEN
