from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.checkins.exceptions import MSG_GROUP_ENDED_CHECK_IN
from app.checkins.models import CheckIn, CheckInHabit
from app.group.exceptions import MSG_GROUP_NOT_FOUND, MSG_INVALID_CURSOR
from app.habits.exceptions import MSG_HABIT_FINISHED
from app.habits.models import HabitStatus
from tests.conftest import at_noon


def _check_in_count(test_engine) -> int:
  with Session(test_engine) as db:
    return db.exec(select(func.count()).select_from(CheckIn)).one()


def _post(client: TestClient, headers, *habits, title: str = "Treino"):
  return client.post(
    "/check-ins",
    json={"title": title, "habit_ids": [str(habit.id) for habit in habits]},
    headers=headers,
  )


def test_member_checks_in_on_group_habit_and_gets_own_progress(
  client: TestClient, user, auth_headers, group_factory, group_habit_factory
) -> None:
  group = group_factory(admin=user)
  habit = group_habit_factory(group)

  response = _post(client, auth_headers, habit)

  assert response.status_code == 201
  body = response.json()
  assert body["user_id"] == str(user.id)
  assert body["habit_ids"] == [str(habit.id)]
  assert [item["habit_id"] for item in body["progress"]] == [str(habit.id)]


def test_non_member_cannot_check_in_and_nothing_is_saved(
  client: TestClient,
  test_engine,
  group_setup,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)

  response = _post(client, group_setup.outsider_headers, habit)

  assert response.status_code == 404
  assert response.json()["habit_ids"] == [str(habit.id)]
  assert _check_in_count(test_engine) == 0


def test_mixed_check_in_counts_for_personal_and_group_habit(
  client: TestClient,
  test_engine,
  user,
  auth_headers,
  habit_factory,
  goal_factory,
  group_factory,
  group_habit_factory,
) -> None:
  personal = habit_factory()
  goal_factory(personal)
  habit = group_habit_factory(group_factory(admin=user))

  response = _post(client, auth_headers, personal, habit)

  assert response.status_code == 201
  assert {item["habit_id"] for item in response.json()["progress"]} == {
    str(personal.id),
    str(habit.id),
  }
  with Session(test_engine) as db:
    linked = db.exec(select(CheckInHabit.habit_id)).all()
  assert sorted(linked) == sorted([personal.id, habit.id])


def test_check_in_refused_in_ended_group_and_finished_habit(
  client: TestClient,
  test_engine,
  user,
  auth_headers,
  group_factory,
  group_habit_factory,
) -> None:
  ended = group_factory(admin=user, ends_on=date(2026, 11, 1))
  in_ended_group = group_habit_factory(ended)

  response = _post(client, auth_headers, in_ended_group)
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED_CHECK_IN

  active = group_factory(admin=user)
  finished = group_habit_factory(
    active, status=HabitStatus.FINISHED, finished_at=date(2026, 11, 5)
  )
  response = _post(client, auth_headers, finished)
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_HABIT_FINISHED
  assert _check_in_count(test_engine) == 0


def test_habit_options_carry_group_only_on_group_habits(
  client: TestClient,
  user,
  auth_headers,
  habit_factory,
  group_factory,
  group_habit_factory,
) -> None:
  personal = habit_factory(category="corrida")
  group = group_factory(admin=user, name="Corredores")
  group_habit = group_habit_factory(group, category="corrida")

  response = client.get(
    "/check-ins/habit-options?category=corrida", headers=auth_headers
  )

  assert response.status_code == 200
  groups = {item["id"]: item["group"] for item in response.json()["items"]}
  assert groups == {
    str(personal.id): None,
    str(group_habit.id): {"id": str(group.id), "name": "Corredores"},
  }


@pytest.fixture
def feed_group(group_factory, member_factory, group_habit_factory, user, other_user):
  group = group_factory(admin=user)
  member_factory(group, other_user)
  return group, group_habit_factory(group)


def _feed(client: TestClient, group, headers, **params):
  return client.get(f"/groups/{group.id}/check-ins", params=params, headers=headers)


def _walk(client: TestClient, group, headers, limit: int) -> list[dict]:
  """Percorre o feed inteiro com `before`, página a página."""
  items: list[dict] = []
  params: dict = {"limit": limit}
  for _ in range(20):  # trava de segurança contra loop infinito
    page = _feed(client, group, headers, **params).json()
    items += page["items"]
    if page["next_cursor"] is None:
      assert page["has_more"] is False
      return items
    assert page["has_more"] is True
    params["before"] = page["next_cursor"]
  raise AssertionError("o feed não terminou")


def test_feed_pages_cover_every_check_in_once_newest_first(
  client: TestClient, auth_headers, feed_group, user, other_user, check_in_factory
) -> None:
  group, habit = feed_group
  made = [
    check_in_factory(
      habit, user=(user, other_user)[day % 2], created_at=at_noon(date(2026, 11, day))
    )
    for day in range(2, 7)
  ]

  items = _walk(client, group, auth_headers, limit=2)

  assert [item["id"] for item in items] == [str(c.id) for c in reversed(made)]
  assert {item["author"]["username"] for item in items} == {
    user.username,
    other_user.username,
  }


def test_feed_breaks_created_at_ties_by_id(
  client: TestClient, auth_headers, feed_group, user, check_in_factory
) -> None:
  group, habit = feed_group
  same_moment = at_noon(date(2026, 11, 3))
  made = [check_in_factory(habit, user=user, created_at=same_moment) for _ in range(4)]

  items = _walk(client, group, auth_headers, limit=1)

  assert [item["id"] for item in items] == [
    str(c.id) for c in sorted(made, key=lambda c: c.id, reverse=True)
  ]


def test_feed_new_check_in_between_pages_does_not_shift_older_ones(
  client: TestClient, auth_headers, feed_group, user, check_in_factory
) -> None:
  group, habit = feed_group
  made = [
    check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, day)))
    for day in range(2, 7)
  ]
  first = _feed(client, group, auth_headers, limit=2).json()

  newer = check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 9)))
  rest = _feed(
    client, group, auth_headers, limit=10, before=first["next_cursor"]
  ).json()

  assert [i["id"] for i in first["items"]] == [str(made[4].id), str(made[3].id)]
  assert [i["id"] for i in rest["items"]] == [str(c.id) for c in reversed(made[:3])]
  assert str(newer.id) not in {i["id"] for i in rest["items"]}


def test_feed_after_returns_only_newer_check_ins(
  client: TestClient, auth_headers, feed_group, user, check_in_factory
) -> None:
  group, habit = feed_group
  old = check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 2)))
  newest_seen = _feed(client, group, auth_headers).json()["items"][0]
  assert newest_seen["id"] == str(old.id)
  later = [
    check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, day)))
    for day in (3, 4)
  ]

  page = _feed(client, group, auth_headers, after=newest_seen["cursor"]).json()

  assert [i["id"] for i in page["items"]] == [str(c.id) for c in reversed(later)]
  assert page["next_cursor"] is None


def test_feed_rejects_invalid_parameters(
  client: TestClient, auth_headers, feed_group, user, check_in_factory
) -> None:
  group, habit = feed_group
  check_in_factory(habit, user=user)
  cursor = _feed(client, group, auth_headers).json()["items"][0]["cursor"]

  both = _feed(client, group, auth_headers, before=cursor, after=cursor)
  bad_cursor = _feed(client, group, auth_headers, before="isto-nao-e-cursor")
  too_small = _feed(client, group, auth_headers, limit=0)
  too_big = _feed(client, group, auth_headers, limit=51)

  assert [r.status_code for r in (both, bad_cursor, too_small, too_big)] == [422] * 4
  assert bad_cursor.json()["detail"] == MSG_INVALID_CURSOR


def test_feed_shows_each_check_in_once_with_only_group_habits(
  client: TestClient,
  auth_headers,
  feed_group,
  user,
  habit_factory,
  group_habit_factory,
  check_in_factory,
) -> None:
  group, habit = feed_group
  second = group_habit_factory(group, name="Alongar")
  personal = habit_factory(name="Pessoal")
  check_in_factory([habit, second], user=user, title="Dois do grupo")
  check_in_factory([habit, personal], user=user, title="Misto")

  items = {i["title"]: i for i in _feed(client, group, auth_headers).json()["items"]}

  assert len(items) == 2
  assert {h["id"] for h in items["Dois do grupo"]["habits"]} == {
    str(habit.id),
    str(second.id),
  }
  assert [h["id"] for h in items["Misto"]["habits"]] == [str(habit.id)]


def test_feed_access_rules(
  client: TestClient,
  auth_headers,
  group_setup,
  group_habit_factory,
  check_in_factory,
  user,
  group_factory,
) -> None:
  outsider = _feed(client, group_setup.group, group_setup.outsider_headers)
  assert outsider.status_code == 404
  assert outsider.json()["detail"] == MSG_GROUP_NOT_FOUND
  assert _feed(client, group_setup.group, {}).status_code == 401

  ended = group_factory(admin=user, ends_on=date(2026, 11, 1))
  habit = group_habit_factory(ended, starts_on=date(2026, 10, 1))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 10, 20)))
  response = _feed(client, ended, auth_headers)
  assert response.status_code == 200
  assert len(response.json()["items"]) == 1
