from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import date, datetime, time
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event
from sqlmodel import Session

from app.auth.models import User
from app.goals.exceptions import MSG_GROUP_HABIT_GOAL_LOCKED
from app.goals.models import Goal, GoalPeriod
from app.goals.repository import list_check_in_days_by_member
from app.goals.streak import ProgressStatus
from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_NOT_FOUND,
)
from app.group.habits import build_members_progress
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.habits.exceptions import MSG_HABIT_ALREADY_FINISHED, MSG_HABIT_NOT_FOUND
from app.habits.models import Habit, HabitCategory, HabitStatus
from app.habits.service import APP_TIMEZONE
from tests.conftest import _auth_headers, _create_user, at_noon

TODAY = date(2026, 11, 11)  # quarta-feira
MONDAY = date(2026, 11, 2)
WEDNESDAY = date(2026, 11, 4)
WEEKLY_GOAL = {"period": "week", "target_count": 4, "period_end_weekday": 7}


def _sp(day: date, hour: int, minute: int = 0) -> datetime:
  """Horário de São Paulo no dia dado."""
  return datetime.combine(day, time(hour, minute), tzinfo=APP_TIMEZONE)


def _save(engine: Engine, obj):
  with Session(engine) as session:
    session.add(obj)
    session.commit()
    session.refresh(obj)
  return obj


def _make_group(engine: Engine, *, ends_on: date | None = None) -> Group:
  return _save(
    engine,
    Group(
      name="Grupo Teste",
      starts_on=date(2026, 10, 1),
      ends_on=ends_on,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code=uuid4().hex[:8].upper(),
    ),
  )


def _add_member(
  engine: Engine,
  group: Group,
  user: User,
  *,
  role: GroupRole = GroupRole.MEMBER,
  joined_at: datetime | None = None,
) -> Member:
  return _save(
    engine,
    Member(
      group_id=group.id,
      user_id=user.id,
      role=role,
      joined_at=joined_at or _sp(date(2026, 10, 1), 12),
    ),
  )


def _make_group_habit(
  engine: Engine,
  group: Group,
  *,
  with_goal: bool = True,
  starts_on: date = date(2026, 11, 1),
  **fields,
) -> Habit:
  """Hábito de grupo com meta diária começando em `starts_on`."""
  fields.setdefault("name", "Hábito do grupo")
  fields.setdefault("category", HabitCategory.CORRIDA)
  fields.setdefault("created_at", starts_on)
  habit = _save(engine, Habit(author_group_id=group.id, **fields))
  if with_goal:
    _save(
      engine,
      Goal(
        habit_id=habit.id, period=GoalPeriod.DAY, target_count=1, starts_on=starts_on
      ),
    )
  return habit


@contextmanager
def _count_queries(engine: Engine) -> Iterator[list[str]]:
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    statements.append(statement)

  event.listen(engine, "before_cursor_execute", before_execute)
  try:
    yield statements
  finally:
    event.remove(engine, "before_cursor_execute", before_execute)


@pytest.fixture
def group_setup(
  test_engine: Engine,
  user: User,
  other_user: User,
  freeze_today: Callable[[date], None],
) -> SimpleNamespace:
  """Grupo ativo com `user` admin, `other_user` membro e um usuário de fora."""
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  _add_member(test_engine, group, other_user)
  outsider = _create_user(test_engine, "fora")
  return SimpleNamespace(
    group=group,
    admin_headers=_auth_headers(user),
    member_headers=_auth_headers(other_user),
    outsider_headers=_auth_headers(outsider),
  )


@pytest.fixture
def ended_group(
  test_engine: Engine, user: User, freeze_today: Callable[[date], None]
) -> Group:
  """Grupo encerrado em 2026-11-01, com `user` admin."""
  freeze_today(TODAY)
  group = _make_group(test_engine, ends_on=date(2026, 11, 1))
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  return group


def _create_body(**fields) -> dict:
  return {"name": "Correr", "category": "corrida", "goal": WEEKLY_GOAL, **fields}


# list_check_in_days_by_member


def test_days_by_member_empty_input_returns_empty_dict() -> None:
  assert list_check_in_days_by_member(None, [], [uuid4()]) == {}
  assert list_check_in_days_by_member(None, [uuid4()], []) == {}


def test_days_by_member_late_join_and_timezone_in_one_query(
  test_engine: Engine, user: User, other_user: User, check_in_factory
) -> None:
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, joined_at=_sp(MONDAY, 8))
  _add_member(test_engine, group, other_user, joined_at=_sp(WEDNESDAY, 9))
  habit = _make_group_habit(test_engine, group)

  for member in (user, other_user):
    check_in_factory(habit, user=member, created_at=at_noon(MONDAY))
    check_in_factory(habit, user=member, created_at=at_noon(WEDNESDAY))
  # 23h50 de São Paulo na quinta é 02h50 UTC da sexta
  check_in_factory(habit, user=other_user, created_at=_sp(date(2026, 11, 5), 23, 50))
  # segundo check-in no mesmo dia conta uma vez
  check_in_factory(habit, user=user, created_at=_sp(WEDNESDAY, 20))

  with Session(test_engine) as db, _count_queries(test_engine) as queries:
    days = list_check_in_days_by_member(db, [habit.id], [user.id, other_user.id])

  assert len(queries) == 1
  assert days[(habit.id, user.id)] == {MONDAY, WEDNESDAY}
  assert days[(habit.id, other_user.id)] == {WEDNESDAY, date(2026, 11, 5)}


def test_days_by_member_join_late_at_night_counts_that_day(
  test_engine: Engine, user: User, check_in_factory
) -> None:
  group = _make_group(test_engine)
  # 23h30 de São Paulo do dia 3 é 02h30 UTC do dia 4
  _add_member(test_engine, group, user, joined_at=_sp(date(2026, 11, 3), 23, 30))
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(MONDAY))
  check_in_factory(habit, user=user, created_at=_sp(date(2026, 11, 3), 23, 45))

  with Session(test_engine) as db:
    days = list_check_in_days_by_member(db, [habit.id], [user.id])

  assert days[(habit.id, user.id)] == {date(2026, 11, 3)}


def test_days_by_member_counts_from_goal_start_when_later_than_join(
  test_engine: Engine, user: User, check_in_factory
) -> None:
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, joined_at=_sp(date(2026, 10, 20), 12))
  habit = _make_group_habit(test_engine, group, starts_on=date(2026, 11, 1))
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
) -> None:
  group = _make_group(test_engine)
  other_group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  # other_user não é membro do grupo (ou saiu): só do outro grupo
  _add_member(test_engine, other_group, other_user)
  habit = _make_group_habit(test_engine, group)
  without_goal = _make_group_habit(test_engine, group, with_goal=False, name="B")
  personal = habit_factory()
  goal_factory(personal)

  check_in_factory(
    [habit, without_goal, personal], user=user, created_at=at_noon(MONDAY)
  )
  check_in_factory(habit, user=other_user, created_at=at_noon(MONDAY))

  with Session(test_engine) as db:
    days = list_check_in_days_by_member(
      db, [habit.id, without_goal.id, personal.id], [user.id, other_user.id]
    )

  assert dict(days) == {(habit.id, user.id): {MONDAY}}
  assert days.get((habit.id, other_user.id), set()) == set()


# build_members_progress


def test_build_members_progress_uses_one_query(
  test_engine: Engine, user: User, other_user: User, check_in_factory
) -> None:
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit_a = _make_group_habit(test_engine, group, name="A")
  habit_b = _make_group_habit(test_engine, group, name="B")
  without_goal = _make_group_habit(test_engine, group, with_goal=False, name="C")
  check_in_factory(habit_a, user=user, created_at=at_noon(TODAY))

  with Session(test_engine) as db:
    loaded_group = db.get(Group, group.id)
    habits = [db.get(Habit, h.id) for h in (habit_a, habit_b, without_goal)]
    with _count_queries(test_engine) as queries:
      progress = build_members_progress(
        db, loaded_group, habits, [user.id, other_user.id], TODAY
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
  test_engine: Engine, user: User, check_in_factory
) -> None:
  group = _make_group(test_engine, ends_on=date(2026, 11, 5))
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 5)))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 8)))

  with Session(test_engine) as db:
    progress = build_members_progress(
      db, db.get(Group, group.id), [db.get(Habit, habit.id)], [user.id], TODAY
    )

  result = progress[(habit.id, user.id)]
  assert result.status == ProgressStatus.ENDED
  assert result.current_period.end == date(2026, 11, 5)
  assert result.current_streak == 1


def test_build_members_progress_freezes_on_habit_finish(
  test_engine: Engine, user: User
) -> None:
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(
    test_engine, group, status=HabitStatus.FINISHED, finished_at=date(2026, 11, 6)
  )

  with Session(test_engine) as db:
    progress = build_members_progress(
      db, db.get(Group, group.id), [db.get(Habit, habit.id)], [user.id], TODAY
    )

  result = progress[(habit.id, user.id)]
  assert result.status == ProgressStatus.ENDED
  assert result.current_period.end == date(2026, 11, 6)


def test_build_members_progress_group_ending_today_is_not_ended(
  test_engine: Engine, user: User
) -> None:
  group = _make_group(test_engine, ends_on=TODAY)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)

  with Session(test_engine) as db:
    progress = build_members_progress(
      db, db.get(Group, group.id), [db.get(Habit, habit.id)], [user.id], TODAY
    )

  assert progress[(habit.id, user.id)].status != ProgressStatus.ENDED


# POST /groups/{group_id}/habits


def test_create_group_habit_as_admin(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
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
  client: TestClient, group_setup: SimpleNamespace
) -> None:
  url = f"/groups/{group_setup.group.id}/habits"
  body = _create_body()
  del body["goal"]

  assert client.post(url, json=_create_body()).status_code == 401
  assert (
    client.post(url, json=body, headers=group_setup.admin_headers).status_code == 422
  )


def test_create_group_habit_in_ended_group(
  client: TestClient, ended_group: Group, user: User
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
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine, habit_factory
) -> None:
  active = _make_group_habit(test_engine, group_setup.group, name="Ativo")
  finished = _make_group_habit(
    test_engine,
    group_setup.group,
    name="Encerrado",
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )
  _make_group_habit(test_engine, _make_group(test_engine), name="De outro grupo")
  habit_factory(name="Pessoal")
  url = f"/groups/{group_setup.group.id}/habits"

  response = client.get(url, headers=group_setup.member_headers)
  assert response.status_code == 200
  assert {h["id"] for h in response.json()} == {str(active.id), str(finished.id)}

  response = client.get(
    url, params={"status": "finished"}, headers=group_setup.member_headers
  )
  assert [h["id"] for h in response.json()] == [str(finished.id)]

  response = client.get(url, params={"status": "x"}, headers=group_setup.member_headers)
  assert response.status_code == 422


def test_list_group_habits_access(
  client: TestClient, group_setup: SimpleNamespace
) -> None:
  url = f"/groups/{group_setup.group.id}/habits"

  assert client.get(url).status_code == 401
  response = client.get(url, headers=group_setup.outsider_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_GROUP_NOT_FOUND


def test_get_group_habit(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}"

  response = client.get(url, headers=group_setup.member_headers)
  assert response.status_code == 200
  assert response.json()["group"]["id"] == str(group_setup.group.id)

  assert client.get(url).status_code == 401
  response = client.get(url, headers=group_setup.outsider_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_GROUP_NOT_FOUND


def test_get_habit_of_other_group_returns_404(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  other_habit = _make_group_habit(test_engine, _make_group(test_engine))

  response = client.get(
    f"/groups/{group_setup.group.id}/habits/{other_habit.id}",
    headers=group_setup.member_headers,
  )

  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND


# PATCH /groups/{group_id}/habits/{habit_id}


def test_update_group_habit_ignores_goal(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)

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
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}"
  body = {"name": "Novo"}

  assert client.patch(url, json=body).status_code == 401
  response = client.patch(url, json=body, headers=group_setup.member_headers)
  assert response.status_code == 403
  response = client.patch(url, json=body, headers=group_setup.outsider_headers)
  assert response.status_code == 404
  response = client.patch(
    url, json={"target_end_date": "2026-10-01"}, headers=group_setup.admin_headers
  )
  assert response.status_code == 422


def test_update_group_habit_in_ended_group(
  client: TestClient, ended_group: Group, user: User, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, ended_group, starts_on=date(2026, 10, 2))

  response = client.patch(
    f"/groups/{ended_group.id}/habits/{habit.id}",
    json={"name": "Novo"},
    headers=_auth_headers(user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


# POST /groups/{group_id}/habits/{habit_id}/finish


def test_finish_group_habit_twice_returns_409(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}/finish"

  response = client.post(url, headers=group_setup.admin_headers)
  assert response.status_code == 200
  assert response.json()["status"] == HabitStatus.FINISHED
  assert response.json()["finished_at"] == TODAY.isoformat()

  response = client.post(url, headers=group_setup.admin_headers)
  assert response.status_code == 409
  assert response.json()["detail"] == MSG_HABIT_ALREADY_FINISHED


def test_finish_group_habit_access(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)
  url = f"/groups/{group_setup.group.id}/habits/{habit.id}/finish"

  assert client.post(url).status_code == 401
  assert client.post(url, headers=group_setup.member_headers).status_code == 403
  assert client.post(url, headers=group_setup.outsider_headers).status_code == 404


def test_finish_group_habit_in_ended_group(
  client: TestClient, ended_group: Group, user: User, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, ended_group, starts_on=date(2026, 10, 2))

  response = client.post(
    f"/groups/{ended_group.id}/habits/{habit.id}/finish",
    headers=_auth_headers(user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_GROUP_ENDED


# PUT /goals/habits/{habit_id}/goal em hábito de grupo


def test_set_goal_on_group_habit_is_locked(
  client: TestClient, group_setup: SimpleNamespace, test_engine: Engine
) -> None:
  habit = _make_group_habit(test_engine, group_setup.group)
  url = f"/goals/habits/{habit.id}/goal"

  for headers in (group_setup.admin_headers, group_setup.member_headers):
    response = client.put(url, json=WEEKLY_GOAL, headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == MSG_GROUP_HABIT_GOAL_LOCKED

  response = client.put(url, json=WEEKLY_GOAL, headers=group_setup.outsider_headers)
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
