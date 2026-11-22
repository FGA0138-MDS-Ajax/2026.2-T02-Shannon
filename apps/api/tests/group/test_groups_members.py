from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.group.exceptions import MSG_GROUP_ENDED, MSG_GROUP_FULL, MSG_GROUP_NOT_FOUND
from app.group.models import GROUP_MAX_MEMBERS, Group, GroupRole, Member
from app.habits.models import Habit
from tests.group.fixtures import TODAY, _sp


def _role_of(test_engine, group: Group, user_id) -> str | None:
  with Session(test_engine) as db:
    member = db.get(Member, (group.id, user_id))
    return member.role if member else None


def test_add_member_by_username(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  group_factory,
  make_users,
  member_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  url = f"/groups/{group.id}/members"

  added = client.post(
    url, json={"username": other_user.username.upper()}, headers=auth_headers
  )
  assert added.status_code == 201
  assert added.json()["user_id"] == str(other_user.id)
  assert added.json()["role"] == GroupRole.MEMBER

  missing = client.post(url, json={"username": "ninguem"}, headers=auth_headers)
  assert missing.status_code == 404

  duplicated = client.post(
    url, json={"username": other_user.username}, headers=auth_headers
  )
  assert duplicated.status_code == 409

  for member, _ in make_users(GROUP_MAX_MEMBERS - 2, prefix="lotacao"):
    member_factory(group, member)
  ((extra, _),) = make_users(1, prefix="extra")
  full = client.post(url, json={"username": extra.username}, headers=auth_headers)
  assert full.status_code == 409
  assert full.json()["detail"] == MSG_GROUP_FULL


def test_add_member_to_ended_group_is_refused(
  client: TestClient, other_user, auth_headers, ended_group
) -> None:
  response = client.post(
    f"/groups/{ended_group.id}/members",
    json={"username": other_user.username},
    headers=auth_headers,
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


def test_promote_and_remove_admins(
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
  group = group_factory(admin=user)
  member_factory(group, other_user)
  promote = f"/groups/{group.id}/members/{other_user.id}/promote"

  assert client.post(promote, headers=auth_headers).status_code == 200
  assert client.post(promote, headers=auth_headers).status_code == 409

  me = f"/groups/{group.id}/members/{user.id}"
  assert client.delete(me, headers=auth_headers).status_code == 409
  other = f"/groups/{group.id}/members/{other_user.id}"
  assert client.delete(other, headers=auth_headers).status_code == 204
  members = client.get(f"/groups/{group.id}/members", headers=auth_headers).json()
  assert [m["user_id"] for m in members] == [str(user.id)]


def test_leave_group_member_and_admin_with_another_admin(
  test_engine,
  client: TestClient,
  user,
  other_user,
  auth_headers,
  other_auth_headers,
  group_factory,
  member_factory,
) -> None:
  group = group_factory(admin=user)
  member_factory(group, other_user)
  leave = f"/groups/{group.id}/leave"

  result = client.post(leave, headers=other_auth_headers)
  assert result.status_code == 200
  assert result.json() == {"group_deleted": False, "promoted_user_id": None}
  assert _role_of(test_engine, group, user.id) == GroupRole.ADMIN

  member_factory(group, other_user, GroupRole.ADMIN)
  result = client.post(leave, headers=auth_headers)
  assert result.json() == {"group_deleted": False, "promoted_user_id": None}
  assert _role_of(test_engine, group, user.id) is None
  assert _role_of(test_engine, group, other_user.id) == GroupRole.ADMIN


def test_leave_group_sole_admin_promotes_oldest_member(
  test_engine,
  client: TestClient,
  user,
  auth_headers,
  make_users,
  group_factory,
  member_factory,
) -> None:
  group = group_factory(admin=user)
  (older, _), (newer, _) = make_users(2)
  member_factory(group, newer, joined_at=_sp(date(2026, 10, 5)))
  member_factory(group, older, joined_at=_sp(date(2026, 10, 2)))

  result = client.post(f"/groups/{group.id}/leave", headers=auth_headers)

  assert result.status_code == 200
  assert result.json() == {"group_deleted": False, "promoted_user_id": str(older.id)}
  assert _role_of(test_engine, group, older.id) == GroupRole.ADMIN
  assert _role_of(test_engine, group, newer.id) == GroupRole.MEMBER


def test_leave_group_tie_on_joined_at_breaks_by_user_id(
  test_engine,
  client: TestClient,
  user,
  auth_headers,
  make_users,
  group_factory,
  member_factory,
) -> None:
  group = group_factory(admin=user)
  (first, _), (second, _) = make_users(2)
  same_moment = _sp(date(2026, 10, 3))
  member_factory(group, first, joined_at=same_moment)
  member_factory(group, second, joined_at=same_moment)

  result = client.post(f"/groups/{group.id}/leave", headers=auth_headers)

  assert result.json()["promoted_user_id"] == str(min(first.id, second.id))


def test_last_member_leaving_deletes_group_and_its_habits(
  test_engine,
  client: TestClient,
  user,
  auth_headers,
  group_factory,
  group_habit_factory,
) -> None:
  group = group_factory(admin=user)
  group_habit_factory(group)

  result = client.post(f"/groups/{group.id}/leave", headers=auth_headers)

  assert result.json() == {"group_deleted": True, "promoted_user_id": None}
  assert client.get(f"/groups/{group.id}", headers=auth_headers).status_code == 404
  with Session(test_engine) as db:
    assert db.get(Group, group.id) is None
    assert db.exec(select(Member).where(Member.group_id == group.id)).all() == []
    assert db.exec(select(Habit).where(Habit.author_group_id == group.id)).all() == []


def test_non_member_cannot_leave_list_or_remove(
  client: TestClient, group_setup, other_user
) -> None:
  group_id = group_setup.group.id
  headers = group_setup.outsider_headers

  responses = [
    client.post(f"/groups/{group_id}/leave", headers=headers),
    client.get(f"/groups/{group_id}/members", headers=headers),
    client.delete(f"/groups/{group_id}/members/{other_user.id}", headers=headers),
    client.post(f"/groups/{uuid4()}/leave", headers=headers),
  ]

  assert [response.status_code for response in responses] == [404] * 4
  assert responses[0].json()["detail"] == MSG_GROUP_NOT_FOUND
