from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.goals.exceptions import MSG_GROUP_HABIT_GOAL_LOCKED
from app.goals.repository import list_check_in_days_by_member
from app.group.exceptions import MSG_GROUP_ENDED, MSG_GROUP_FORBIDDEN
from app.habits.exceptions import MSG_HABIT_ALREADY_FINISHED, MSG_HABIT_NOT_FOUND
from tests.conftest import at_noon
from tests.group.fixtures import _sp

DAILY_GOAL = {"period": "day", "target_count": 1}
WEEKLY_GOAL = {"period": "week", "target_count": 4, "period_end_weekday": 7}


def test_group_habit_lifecycle_and_permissions(
  client: TestClient, group_setup, group_factory, group_habit_factory
) -> None:
  group = group_setup.group
  url = f"/groups/{group.id}/habits"
  body = {"name": "Correr", "category": "corrida", "goal": DAILY_GOAL}

  created = client.post(url, json=body, headers=group_setup.admin_headers)
  assert created.status_code == 201
  habit = created.json()
  assert habit["author_group_id"] == str(group.id)
  assert habit["author_user_id"] is None

  member = client.post(url, json=body, headers=group_setup.member_headers)
  assert member.status_code == 403
  assert member.json()["detail"] == MSG_GROUP_FORBIDDEN
  outsider = client.post(url, json=body, headers=group_setup.outsider_headers)
  assert outsider.status_code == 404

  habit_url = f"{url}/{habit['id']}"
  patched = client.patch(
    habit_url,
    json={"name": "Correr mais", "goal": WEEKLY_GOAL},
    headers=group_setup.admin_headers,
  )
  assert patched.status_code == 200
  assert patched.json()["name"] == "Correr mais"
  assert patched.json()["goal"]["period"] == "day"

  locked = client.put(
    f"/goals/habits/{habit['id']}/goal",
    json=WEEKLY_GOAL,
    headers=group_setup.admin_headers,
  )
  assert locked.status_code == 409
  assert locked.json()["detail"] == MSG_GROUP_HABIT_GOAL_LOCKED

  finish = f"{habit_url}/finish"
  assert client.post(finish, headers=group_setup.admin_headers).status_code == 200
  again = client.post(finish, headers=group_setup.admin_headers)
  assert again.status_code == 409
  assert again.json()["detail"] == MSG_HABIT_ALREADY_FINISHED

  other_group = group_factory()
  foreign = group_habit_factory(other_group)
  response = client.get(f"{url}/{foreign.id}", headers=group_setup.admin_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND


def test_create_habit_in_ended_group_is_refused(
  client: TestClient, ended_group, auth_headers
) -> None:
  response = client.post(
    f"/groups/{ended_group.id}/habits",
    json={"name": "Correr", "category": "corrida", "goal": DAILY_GOAL},
    headers=auth_headers,
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


def test_check_in_days_by_member_follow_join_date_and_sao_paulo_day(
  test_engine,
  user,
  other_user,
  make_users,
  check_in_factory,
  group_factory,
  member_factory,
  group_habit_factory,
  query_counter,
) -> None:
  group = group_factory()
  early, late = user, other_user
  ((left, _),) = make_users(1, prefix="saiu")
  member_factory(group, early, joined_at=_sp(date(2026, 11, 1)))
  member_factory(group, late, joined_at=_sp(date(2026, 11, 3), 9))
  habit = group_habit_factory(group, starts_on=date(2026, 11, 1))

  for member in (early, late, left):
    for day in (2, 3, 4):
      check_in_factory(habit, user=member, created_at=at_noon(date(2026, 11, day)))
  check_in_factory(habit, user=late, created_at=_sp(date(2026, 11, 5), 23, 50))
  check_in_factory(habit, user=early, created_at=_sp(date(2026, 11, 3), 20))

  with Session(test_engine) as db, query_counter() as queries:
    days = list_check_in_days_by_member(db, [habit.id], [early.id, late.id])

  assert len(queries) == 1
  assert days[(habit.id, early.id)] == {date(2026, 11, d) for d in (2, 3, 4)}
  assert days[(habit.id, late.id)] == {date(2026, 11, d) for d in (3, 4, 5)}
  assert (habit.id, left.id) not in days
