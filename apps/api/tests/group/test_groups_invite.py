from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_FULL,
  MSG_INVITE_CODE_INVALID,
)
from app.group.models import GROUP_MAX_MEMBERS, Group, Member
from tests.group.fixtures import TODAY


def _members_count(test_engine, group: Group) -> int:
  with Session(test_engine) as db:
    return db.exec(
      select(func.count()).select_from(Member).where(Member.group_id == group.id)
    ).one()


def test_join_by_code_accepts_messy_formatting_and_rejects_invalid_cases(
  client: TestClient,
  user,
  other_user,
  other_auth_headers,
  group_factory,
  make_users,
  member_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  code = group.invite_code
  messy = f" {code[:4].lower()}-{code[4:].lower()} "

  joined = client.post("/groups/join", json={"code": messy}, headers=other_auth_headers)
  assert joined.status_code == 201
  assert joined.json()["id"] == str(group.id)
  assert joined.json()["invite_code"] is None

  again = client.post("/groups/join", json={"code": code}, headers=other_auth_headers)
  assert again.status_code == 409

  unknown = client.post(
    "/groups/join", json={"code": "ZZZZZZZZ"}, headers=other_auth_headers
  )
  assert unknown.status_code == 404
  assert unknown.json()["detail"] == MSG_INVITE_CODE_INVALID


def test_join_by_code_in_full_and_ended_groups(
  client: TestClient,
  user,
  other_auth_headers,
  group_factory,
  make_users,
  member_factory,
  ended_group,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  full = group_factory(admin=user)
  for member, _ in make_users(GROUP_MAX_MEMBERS - 1):
    member_factory(full, member)

  response = client.post(
    "/groups/join", json={"code": full.invite_code}, headers=other_auth_headers
  )
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_FULL

  response = client.post(
    "/groups/join", json={"code": ended_group.invite_code}, headers=other_auth_headers
  )
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


def test_preview_does_not_create_member(
  test_engine,
  client: TestClient,
  user,
  other_auth_headers,
  group_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user, name="Prévia")

  response = client.get(
    f"/groups/invite/{group.invite_code}", headers=other_auth_headers
  )

  assert response.status_code == 200
  assert response.json() == {
    "id": str(group.id),
    "name": "Prévia",
    "members_count": 1,
    "status": "active",
  }
  assert _members_count(test_engine, group) == 1


def test_regenerate_invite_code_keeps_members_and_kills_old_code(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  other_auth_headers,
  group_factory,
  member_factory,
  make_users,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  member_factory(group, other_user)
  old_code = group.invite_code
  url = f"/groups/{group.id}/invite/regenerate"

  denied = client.post(url, headers=other_auth_headers)
  assert denied.status_code == 403
  assert denied.json()["detail"] == MSG_GROUP_FORBIDDEN

  renewed = client.post(url, headers=auth_headers)
  assert renewed.status_code == 200
  new_code = renewed.json()["invite_code"]
  assert new_code != old_code and len(new_code) == 8

  ((_, newcomer_headers),) = make_users(1, prefix="novo")
  old = client.post("/groups/join", json={"code": old_code}, headers=newcomer_headers)
  assert old.status_code == 404
  new = client.post("/groups/join", json={"code": new_code}, headers=newcomer_headers)
  assert new.status_code == 201

  # Quem já era membro continua no grupo.
  members = client.get(f"/groups/{group.id}/members", headers=auth_headers).json()
  assert len(members) == 3
