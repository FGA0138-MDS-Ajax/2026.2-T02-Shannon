from datetime import date
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from app.auth.models import User
from app.goals.exceptions import MSG_GROUP_HABIT_GOAL_LOCKED
from app.goals.models import GoalPeriod
from app.goals.repository import list_check_in_days_by_member
from app.goals.streak import ProgressStatus
from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_NOT_FOUND,
)
from app.group.habits import build_members_progress
from app.group.models import Group
from app.habits.exceptions import MSG_HABIT_ALREADY_FINISHED, MSG_HABIT_NOT_FOUND
from app.habits.models import Habit, HabitStatus
from tests.conftest import _auth_headers, at_noon
from tests.group.fixtures import TODAY, _sp

MONDAY = date(2026, 11, 2)
WEDNESDAY = date(2026, 11, 4)
WEEKLY_GOAL = {"period": "week", "target_count": 4, "period_end_weekday": 7}


def _create_body(**fields) -> dict:
  return {"name": "Correr", "category": "corrida", "goal": WEEKLY_GOAL, **fields}


# list_check_in_days_by_member


def test_days_by_member_empty_input_returns_empty_dict() -> None:
  assert list_check_in_days_by_member(None, [], [uuid4()]) == {}
  assert list_check_in_days_by_member(None, [uuid4()], []) == {}


def test_days_by_member_late_join_and_timezone_in_one_query(
  test_engine: Engine,
  user: User,
  other_user: User,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  query_counter,
) -> None:
  group = group_factory()
  member_factory(group, user, joined_at=_sp(MONDAY, 8))
  member_factory(group, other_user, joined_at=_sp(WEDNESDAY, 9))
  habit = group_habit_factory(group)

  for member in (user, other_user):
    check_in_factory(habit, user=member, created_at=at_noon(MONDAY))
    check_in_factory(habit, user=member, created_at=at_noon(WEDNESDAY))

  check_in_factory(
    habit,
    user=other_user,
    created_at=_sp(date(2026, 11, 5), 23, 50),
  )

  check_in_factory(habit, user=user, created_at=_sp(WEDNESDAY, 20))

  with Session(test_engine) as db, query_counter() as queries:
    days = list_check_in_days_by_member(db, [habit.id], [user.id, other_user.id])

  assert len(queries) == 1
  assert days[(habit.id, user.id)] == {MONDAY, WEDNESDAY}
  assert days[(habit.id, other_user.id)] == {WEDNESDAY, date(2026, 11, 5)}


def test_days_by_member_join_late_at_night_counts_that_day(
  test_engine: Engine,
  user: User,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory()

  member_factory(
    group,
    user,
    joined_at=_sp(date(2026, 11, 3), 23, 30),
  )

  habit = group_habit_factory(group)
  check_in_factory(habit, user=user, created_at=at_noon(MONDAY))
  check_in_factory(
    habit,
    user=user,
    created_at=_sp(date(2026, 11, 3), 23, 45),
  )

  with Session(test_engine) as db:
    days = list_check_in_days_by_member(db, [habit.id], [user.id])

  assert days[(habit.id, user.id)] == {date(2026, 11, 3)}


def test_days_by_member_counts_from_goal_start_when_later_than_join(
  test_engine: Engine,
  user: User,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory()
  member_factory(
    group,
    user,
    joined_at=_sp(date(2026, 10, 20), 12),
  )

  habit = group_habit_factory(group, starts_on=date(2026, 11, 1))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 10, 30)))
  check_in_factory(habit, user=user, created_at=at_noon(MONDAY))

  with Session(test_engine) as db:
    days = list_check_in_days_by_member(db, [habit.id], [user.id])

  assert days[(habit.id, user.id)] == {MONDAY}


def test_days_by_member_ignores_non_members_and_other_habits(
  test_engine: Engine,
  user: User,
  other_user: User,
  habit_factory,
  goal_factory,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory()
  other_group = group_factory()

  member_factory(group, user)

  member_factory(other_group, other_user)

  habit = group_habit_factory(group)
  without_goal = group_habit_factory(group, with_goal=False, name="B")

  personal = habit_factory()
  goal_factory(personal)

  check_in_factory(
    [habit, without_goal, personal],
    user=user,
    created_at=at_noon(MONDAY),
  )
  check_in_factory(habit, user=other_user, created_at=at_noon(MONDAY))

  with Session(test_engine) as db:
    days = list_check_in_days_by_member(
      db,
      [habit.id, without_goal.id, personal.id],
      [user.id, other_user.id],
    )

  assert dict(days) == {(habit.id, user.id): {MONDAY}}
  assert days.get((habit.id, other_user.id), set()) == set()


# build_members_progress


def test_build_members_progress_uses_one_query(
  test_engine: Engine,
  user: User,
  other_user: User,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  query_counter,
) -> None:
  group = group_factory()
  member_factory(group, user)
  member_factory(group, other_user)

  habit_a = group_habit_factory(group, name="A")
  habit_b = group_habit_factory(group, name="B")
  without_goal = group_habit_factory(group, with_goal=False, name="C")

  check_in_factory(habit_a, user=user, created_at=at_noon(TODAY))

  with Session(test_engine) as db:
    loaded_group = db.get(Group, group.id)
    habits = [db.get(Habit, h.id) for h in (habit_a, habit_b, without_goal)]

    with query_counter() as queries:
      progress = build_members_progress(
        db,
        loaded_group,
        habits,
        [user.id, other_user.id],
        TODAY,
      )

  assert len(queries) == 1
  assert set(progress) == {
    (habit_a.id, user.id),
    (habit_a.id, other_user.id),
    (habit_b.id, user.id),
    (habit_b.id, other_user.id),
  }
  assert progress[(habit_a.id, user.id)].status == ProgressStatus.COMPLETED
  assert progress[(habit_a.id, other_user.id)].status != ProgressStatus.COMPLETED


def test_build_members_progress_freezes_on_group_end(
  test_engine: Engine,
  user: User,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory(ends_on=date(2026, 11, 5))
  member_factory(group, user)

  habit = group_habit_factory(group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 5)))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 8)))

  with Session(test_engine) as db:
    progress = build_members_progress(
      db,
      db.get(Group, group.id),
      [db.get(Habit, habit.id)],
      [user.id],
      TODAY,
    )

  result = progress[(habit.id, user.id)]
  assert result.status == ProgressStatus.ENDED
  assert result.current_period.end == date(2026, 11, 5)
  assert result.current_streak == 1


def test_build_members_progress_freezes_on_habit_finish(
  test_engine: Engine,
  user: User,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory()
  member_factory(group, user)

  habit = group_habit_factory(
    group,
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 6),
  )

  with Session(test_engine) as db:
    progress = build_members_progress(
      db,
      db.get(Group, group.id),
      [db.get(Habit, habit.id)],
      [user.id],
      TODAY,
    )

  result = progress[(habit.id, user.id)]
  assert result.status == ProgressStatus.ENDED
  assert result.current_period.end == date(2026, 11, 6)


def test_build_members_progress_group_ending_today_is_not_ended(
  test_engine: Engine,
  user: User,
  group_factory,
  member_factory,
  group_habit_factory,
) -> None:
  group = group_factory(ends_on=TODAY)
  member_factory(group, user)

  habit = group_habit_factory(group)

  with Session(test_engine) as db:
    progress = build_members_progress(
      db,
      db.get(Group, group.id),
      [db.get(Habit, habit.id)],
      [user.id],
      TODAY,
    )

  assert progress[(habit.id, user.id)].status != ProgressStatus.ENDED


# POST /groups/{group_id}/habits


def test_create_group_habit_as_admin(
  client: TestClient,
  group_setup: SimpleNamespace,
  test_engine: Engine,
) -> None:
  response = client.post(
    f"/groups/{group_setup.group.id}/habits",
    json=_create_body(is_public=True),
    headers=group_setup.admin_headers,
  )

  assert response.status_code == 201, response.text
  body = response.json()
  assert body["author_group_id"] == str(group_setup.group.id)
  assert body["author_user_id"] is None
  assert body["is_public"] is False
  assert body["created_at"] == TODAY.isoformat()
  assert body["goal"]["starts_on"] == TODAY.isoformat()
  assert body["goal"]["target_count"] == 4
  assert body["group"] == {"id": str(group_setup.group.id), "name": "Grupo Teste"}

  with Session(test_engine) as db:
    habit = db.get(Habit, UUID(body["id"]))
    assert habit.author_user_id is None
    assert habit.goal is not None


@pytest.mark.parametrize(
  ("headers_attr", "expected_status", "expected_detail"),
  [
    ("member_headers", 403, MSG_GROUP_FORBIDDEN),
    ("outsider_headers", 404, MSG_GROUP_NOT_FOUND),
  ],
)
def test_create_group_habit_access(
  client: TestClient,
  group_setup: SimpleNamespace,
  headers_attr: str,
  expected_status: int,
  expected_detail: str,
) -> None:
  response = client.post(
    f"/groups/{group_setup.group.id}/habits",
    json=_create_body(),
    headers=getattr(group_setup, headers_attr),
  )

  assert response.status_code == expected_status
  assert response.json()["detail"] == expected_detail


def test_create_group_habit_requires_auth_and_goal(
  client: TestClient,
  group_setup: SimpleNamespace,
) -> None:
  url = f"/groups/{group_setup.group.id}/habits"
  body = _create_body()
  del body["goal"]

  assert client.post(url, json=_create_body()).status_code == 401
  assert (
    client.post(url, json=body, headers=group_setup.admin_headers).status_code == 422
  )


def test_create_group_habit_in_ended_group(
  client: TestClient,
  ended_group: Group,
  user: User,
) -> None:
  response = client.post(
    f"/groups/{ended_group.id}/habits",
    json=_create_body(),
    headers=_auth_headers(user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


# GET /groups/{group_id}/habits e /groups/{group_id}/habits/{habit_id}


def test_list_group_habits_with_status_filter(
  client: TestClient,
  group_setup: SimpleNamespace,
  test_engine: Engine,
  habit_factory,
  group_factory,
  group_habit_factory,
) -> None:
  active = group_habit_factory(group_setup.group, name="Ativo")
  finished = group_habit_factory(
    group_setup.group,
    name="Encerrado",
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )

  other_group = group_factory()
  group_habit_factory(other_group, name="De outro grupo")

  habit_factory(name="Pessoal")
  url = f"/groups/{group_setup.group.id}/habits"

  response = client.get(url, headers=group_setup.member_headers)
  assert response.status_code == 200
  assert {h["id"] for h in response.json()} == {str(active.id), str(finished.id)}

  response = client.get(
    url,
    params={"status": "finished"},
    headers=group_setup.member_headers,
  )
  assert [h["id"] for h in response.json()] == [str(finished.id)]

  response = client.get(
    url,
    params={"status": "x"},
    headers=group_setup.member_headers,
  )
  assert response.status_code == 422


def test_list_group_habits_access(
  client: TestClient,
  group_setup: SimpleNamespace,
) -> None:
  url = f"/groups/{group_setup.group.id}/habits"

  assert client.get(url).status_code == 401

  response = client.get(url, headers=group_setup.outsider_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_GROUP_NOT_FOUND


def test_get_group_habit(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}"

  response = client.get(url, headers=group_setup.member_headers)
  assert response.status_code == 200
  assert response.json()["group"]["id"] == str(group_setup.group.id)

  assert client.get(url).status_code == 401

  response = client.get(url, headers=group_setup.outsider_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_GROUP_NOT_FOUND


def test_get_habit_of_other_group_returns_404(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_factory,
  group_habit_factory,
) -> None:
  other_group = group_factory()
  other_habit = group_habit_factory(other_group)

  response = client.get(
    f"/groups/{group_setup.group.id}/habits/{other_habit.id}",
    headers=group_setup.member_headers,
  )

  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND


# PATCH /groups/{group_id}/habits/{habit_id}


def test_update_group_habit_ignores_goal(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)

  response = client.patch(
    f"/groups/{group_setup.group.id}/habits/{habit.id}",
    json={"name": "Novo nome", "goal": WEEKLY_GOAL, "is_public": True},
    headers=group_setup.admin_headers,
  )

  assert response.status_code == 200, response.text
  body = response.json()
  assert body["name"] == "Novo nome"
  assert body["goal"]["period"] == GoalPeriod.DAY
  assert body["is_public"] is False


def test_update_group_habit_errors(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}"
  body = {"name": "Novo"}

  assert client.patch(url, json=body).status_code == 401

  response = client.patch(url, json=body, headers=group_setup.member_headers)
  assert response.status_code == 403

  response = client.patch(url, json=body, headers=group_setup.outsider_headers)
  assert response.status_code == 404

  response = client.patch(
    url,
    json={"target_end_date": "2026-10-01"},
    headers=group_setup.admin_headers,
  )
  assert response.status_code == 422


def test_update_group_habit_in_ended_group(
  client: TestClient,
  ended_group: Group,
  user: User,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(ended_group, starts_on=date(2026, 10, 2))

  response = client.patch(
    f"/groups/{ended_group.id}/habits/{habit.id}",
    json={"name": "Novo"},
    headers=_auth_headers(user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


# POST /groups/{group_id}/habits/{habit_id}/finish


def test_finish_group_habit_twice_returns_409(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}/finish"

  response = client.post(url, headers=group_setup.admin_headers)
  assert response.status_code == 200
  assert response.json()["status"] == HabitStatus.FINISHED
  assert response.json()["finished_at"] == TODAY.isoformat()

  response = client.post(url, headers=group_setup.admin_headers)
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_HABIT_ALREADY_FINISHED


def test_finish_group_habit_access(
  client: TestClient,
  group_setup: SimpleNamespace,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}/finish"

  assert client.post(url).status_code == 401
  assert client.post(url, headers=group_setup.member_headers).status_code == 403
  assert client.post(url, headers=group_setup.outsider_headers).status_code == 404


def test_finish_group_habit_in_ended_group(
  client: TestClient,
  ended_group: Group,
  user: User,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(ended_group, starts_on=date(2026, 10, 2))

  response = client.post(
    f"/groups/{ended_group.id}/habits/{habit.id}/finish",
    headers=_auth_headers(user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


# PUT /goals/habits/{habit_id}/goal em hábito de grupo


def test_set_goal_on_group_habit_is_locked(
  client: TestClient,
  group_setup: SimpleNamespace,
  test_engine: Engine,
  group_habit_factory,
) -> None:
  habit = group_habit_factory(group_setup.group)
  url = f"/goals/habits/{habit.id}/goal"

  for headers in (group_setup.admin_headers, group_setup.member_headers):
    response = client.put(url, json=WEEKLY_GOAL, headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == MSG_GROUP_HABIT_GOAL_LOCKED

  response = client.put(
    url,
    json=WEEKLY_GOAL,
    headers=group_setup.outsider_headers,
  )
  assert response.status_code == 404

  with Session(test_engine) as db:
    assert db.get(Habit, habit.id).goal.period == GoalPeriod.DAY


# Swagger


def test_openapi_documents_group_habit_errors(client: TestClient) -> None:
  paths = client.get("/openapi.json").json()["paths"]
  collection = "/groups/{group_id}/habits"
  item = f"{collection}/{{habit_id}}"

  expected = {
    (collection, "post"): {"201", "401", "403", "404", "409", "422"},
    (collection, "get"): {"200", "401", "404", "422"},
    (item, "get"): {"200", "401", "404"},
    (item, "patch"): {"200", "401", "403", "404", "409", "422"},
    (f"{item}/finish", "post"): {"200", "401", "403", "404", "409"},
  }

  for (path, method), codes in expected.items():
    assert codes <= set(paths[path][method]["responses"]), (path, method)

  conflict = paths["/goals/habits/{habit_id}/goal"]["put"]["responses"]["409"]
  examples = conflict["content"]["application/json"]["examples"].values()
  assert MSG_GROUP_HABIT_GOAL_LOCKED in {e["value"]["detail"] for e in examples}
