from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from app.auth.models import User
from app.goals.streak import ProgressStatus
from app.group.exceptions import MSG_GROUP_NOT_FOUND
from app.group.models import GroupRole
from app.habits.exceptions import MSG_HABIT_NOT_FOUND
from app.habits.models import HabitStatus
from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.fixtures import TODAY, _sp


def test_habit_stats_orders_by_streak_then_username_and_includes_zeros(
  client: TestClient,
  test_engine,
  freeze_today,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  query_counter,
) -> None:
  freeze_today(TODAY)
  group = group_factory()

  ana = _create_user(test_engine, "ana")
  bia = _create_user(test_engine, "bia")
  caio = _create_user(test_engine, "caio")
  ex_member = _create_user(test_engine, "ex")

  member_factory(group, ana, role=GroupRole.ADMIN)
  member_factory(group, bia)
  member_factory(group, caio)

  habit = group_habit_factory(group, name="Correr 5 km")

  for day in (date(2026, 11, 9), date(2026, 11, 10), TODAY):
    check_in_factory(habit, user=bia, created_at=at_noon(day))

  check_in_factory(habit, user=ana, created_at=at_noon(date(2026, 11, 2)))
  check_in_factory(habit, user=ana, created_at=at_noon(TODAY))

  check_in_factory(habit, user=ex_member, created_at=at_noon(TODAY))

  with query_counter() as queries:
    response = client.get(
      f"/groups/{group.id}/habits/{habit.id}/stats",
      headers=_auth_headers(ana),
    )

  assert response.status_code == 200
  data = response.json()
  assert data["as_of"] == TODAY.isoformat()
  assert data["habit_id"] == str(habit.id)
  assert data["name"] == "Correr 5 km"
  assert data["habit_status"] == HabitStatus.ACTIVE

  members = data["members"]
  assert [m["user"]["id"] for m in members] == [
    str(bia.id),
    str(ana.id),
    str(caio.id),
  ]

  assert members[0]["check_in_days"] == 3
  assert members[0]["progress"]["current_streak"] == 3
  assert members[0]["progress"]["status"] == ProgressStatus.COMPLETED

  assert members[1]["check_in_days"] == 2
  assert members[1]["progress"]["current_streak"] == 1
  assert members[1]["progress"]["consistent_days"] == 1

  assert members[2]["check_in_days"] == 0
  assert members[2]["progress"]["current_streak"] == 0
  assert members[2]["progress"]["best_streak"] == 0
  assert members[2]["progress"]["consistent_days"] == 0

  assert len(queries) <= 7


def test_habit_stats_tie_breaks_by_username(
  client: TestClient,
  test_engine,
  freeze_today,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  freeze_today(TODAY)
  group = group_factory()

  zeca = _create_user(test_engine, "zeca")
  bruno = _create_user(test_engine, "bruno")

  member_factory(group, zeca, role=GroupRole.ADMIN)
  member_factory(group, bruno)

  habit = group_habit_factory(group, name="Correr 5 km")

  check_in_factory(habit, user=zeca, created_at=at_noon(TODAY))
  check_in_factory(habit, user=bruno, created_at=at_noon(TODAY))

  response = client.get(
    f"/groups/{group.id}/habits/{habit.id}/stats",
    headers=_auth_headers(zeca),
  )

  assert response.status_code == 200
  usernames = [m["user"]["username"] for m in response.json()["members"]]
  assert usernames == [bruno.username, zeca.username]


def test_habit_stats_respects_late_join_and_query_count_independent_of_members(
  client: TestClient,
  test_engine,
  freeze_today,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  query_counter,
) -> None:
  freeze_today(TODAY)
  group = group_factory()

  early = _create_user(test_engine, "early")
  late = _create_user(test_engine, "late")

  member_factory(
    group,
    early,
    role=GroupRole.ADMIN,
    joined_at=_sp(date(2026, 11, 1)),
  )
  member_factory(
    group,
    late,
    joined_at=_sp(date(2026, 11, 10)),
  )

  habit = group_habit_factory(group, name="Correr 5 km")

  for day in (
    date(2026, 11, 8),
    date(2026, 11, 9),
    date(2026, 11, 10),
    TODAY,
  ):
    check_in_factory(habit, user=late, created_at=at_noon(day))

  with query_counter() as queries_two:
    response = client.get(
      f"/groups/{group.id}/habits/{habit.id}/stats",
      headers=_auth_headers(early),
    )

  assert response.status_code == 200
  by_id = {m["user"]["id"]: m for m in response.json()["members"]}
  assert by_id[str(late.id)]["check_in_days"] == 2
  assert by_id[str(late.id)]["progress"]["current_streak"] == 2

  for i in range(4):
    extra = _create_user(test_engine, f"extra{i}")
    member_factory(group, extra)

  with query_counter() as queries_six:
    response = client.get(
      f"/groups/{group.id}/habits/{habit.id}/stats",
      headers=_auth_headers(early),
    )

  assert response.status_code == 200
  assert len(response.json()["members"]) == 6
  assert len(queries_six) == len(queries_two)


def test_habit_stats_frozen_when_group_ended(
  client: TestClient,
  test_engine,
  freeze_today,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  freeze_today(TODAY)
  ends_on = date(2026, 11, 5)

  group = group_factory(ends_on=ends_on)
  admin = _create_user(test_engine, "admin")
  member_factory(group, admin, role=GroupRole.ADMIN)

  habit = group_habit_factory(
    group,
    starts_on=date(2026, 11, 1),
    name="Correr 5 km",
  )

  check_in_factory(habit, user=admin, created_at=at_noon(date(2026, 11, 4)))
  check_in_factory(habit, user=admin, created_at=at_noon(ends_on))

  check_in_factory(habit, user=admin, created_at=at_noon(date(2026, 11, 6)))

  response = client.get(
    f"/groups/{group.id}/habits/{habit.id}/stats",
    headers=_auth_headers(admin),
  )

  assert response.status_code == 200
  data = response.json()
  assert data["as_of"] == ends_on.isoformat()
  assert data["members"][0]["check_in_days"] == 2
  assert data["members"][0]["progress"]["current_streak"] == 2


def test_habit_stats_without_goal_returns_empty_members(
  client: TestClient,
  freeze_today,
  user: User,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  freeze_today(TODAY)
  group = group_factory()
  member_factory(group, user, role=GroupRole.ADMIN)

  habit = group_habit_factory(
    group,
    with_goal=False,
    name="Correr 5 km",
  )

  response = client.get(
    f"/groups/{group.id}/habits/{habit.id}/stats",
    headers=_auth_headers(user),
  )

  assert response.status_code == 200
  assert response.json() == {
    "as_of": TODAY.isoformat(),
    "habit_id": str(habit.id),
    "name": "Correr 5 km",
    "habit_status": HabitStatus.ACTIVE,
    "members": [],
  }


def test_habit_stats_errors_and_access(
  client: TestClient,
  freeze_today,
  user: User,
  other_user: User,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  freeze_today(TODAY)

  group_a = group_factory()
  group_b = group_factory()

  member_factory(group_a, user, role=GroupRole.ADMIN)
  member_factory(group_b, other_user, role=GroupRole.ADMIN)

  habit_a = group_habit_factory(group_a)
  habit_b = group_habit_factory(group_b)

  resp = client.get(f"/groups/{group_a.id}/habits/{habit_a.id}/stats")
  assert resp.status_code == 401

  resp = client.get(
    f"/groups/{group_a.id}/habits/{habit_a.id}/stats",
    headers=_auth_headers(other_user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_GROUP_NOT_FOUND

  resp = client.get(
    f"/groups/{uuid4()}/habits/{habit_a.id}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_GROUP_NOT_FOUND

  resp = client.get(
    f"/groups/{group_a.id}/habits/{habit_b.id}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_HABIT_NOT_FOUND

  resp = client.get(
    f"/groups/{group_a.id}/habits/{uuid4()}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_HABIT_NOT_FOUND

  assert (
    client.get(
      f"/groups/nao-uuid/habits/{habit_a.id}/stats",
      headers=_auth_headers(user),
    ).status_code
    == 422
  )

  assert (
    client.get(
      f"/groups/{group_a.id}/habits/nao-uuid/stats",
      headers=_auth_headers(user),
    ).status_code
    == 422
  )


def test_openapi_documents_group_habit_stats(client: TestClient) -> None:
  paths = client.get("/openapi.json").json()["paths"]
  op = paths["/groups/{group_id}/habits/{habit_id}/stats"]["get"]

  assert {"200", "401", "404", "422"} <= set(op["responses"])

  not_found_examples = op["responses"]["404"]["content"]["application/json"]["examples"]
  assert {"grupo_nao_encontrado", "habito_nao_encontrado"} <= set(not_found_examples)
