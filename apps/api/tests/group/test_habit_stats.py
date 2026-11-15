from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import date, datetime, time
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import Engine, event
from sqlmodel import Session

from app.auth.models import User
from app.goals.models import Goal, GoalPeriod
from app.goals.streak import ProgressStatus
from app.group.exceptions import MSG_GROUP_NOT_FOUND
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.habits.exceptions import MSG_HABIT_NOT_FOUND
from app.habits.models import Habit, HabitCategory, HabitStatus
from app.habits.service import APP_TIMEZONE
from tests.conftest import _auth_headers, _create_user, at_noon

TODAY = date(2026, 11, 11)


def _sp(day: date, hour: int = 12, minute: int = 0) -> datetime:
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
      joined_at=joined_at or _sp(date(2026, 10, 1)),
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
  fields.setdefault("name", "Correr 5 km")
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


def test_habit_stats_orders_by_streak_then_username_and_includes_zeros(
  client: TestClient,
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  check_in_factory,
) -> None:
  freeze_today(TODAY)
  group = _make_group(test_engine)
  ana = _create_user(test_engine, "ana")
  bia = _create_user(test_engine, "bia")
  caio = _create_user(test_engine, "caio")
  ex_member = _create_user(test_engine, "ex")
  _add_member(test_engine, group, ana, role=GroupRole.ADMIN)
  _add_member(test_engine, group, bia)
  _add_member(test_engine, group, caio)
  habit = _make_group_habit(test_engine, group)

  # bia: 3 dias seguidos até hoje (streak 3)
  for day in (date(2026, 11, 9), date(2026, 11, 10), TODAY):
    check_in_factory(habit, user=bia, created_at=at_noon(day))

  # ana: 1 dia hoje (streak 1) e 1 dia antigo (check_in_days 2)
  check_in_factory(habit, user=ana, created_at=at_noon(date(2026, 11, 2)))
  check_in_factory(habit, user=ana, created_at=at_noon(TODAY))

  # ex_member tem check-in mas não é mais membro: não pode aparecer
  check_in_factory(habit, user=ex_member, created_at=at_noon(TODAY))

  # caio: sem check-in -> aparece com zeros

  with _count_queries(test_engine) as queries:
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
  assert [m["user"]["id"] for m in members] == [str(bia.id), str(ana.id), str(caio.id)]

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

  # Número fixo de consultas: auth(user) + group + member + habit(goal) + members + days
  assert len(queries) <= 7


def test_habit_stats_tie_breaks_by_username(
  client: TestClient,
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  check_in_factory,
) -> None:
  freeze_today(TODAY)
  group = _make_group(test_engine)
  zeca = _create_user(test_engine, "zeca")
  bruno = _create_user(test_engine, "bruno")
  _add_member(test_engine, group, zeca, role=GroupRole.ADMIN)
  _add_member(test_engine, group, bruno)
  habit = _make_group_habit(test_engine, group)

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
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  check_in_factory,
) -> None:
  freeze_today(TODAY)
  group = _make_group(test_engine)
  early = _create_user(test_engine, "early")
  late = _create_user(test_engine, "late")
  _add_member(
    test_engine,
    group,
    early,
    role=GroupRole.ADMIN,
    joined_at=_sp(date(2026, 11, 1)),
  )
  _add_member(test_engine, group, late, joined_at=_sp(date(2026, 11, 10)))
  habit = _make_group_habit(test_engine, group)

  for day in (date(2026, 11, 8), date(2026, 11, 9), date(2026, 11, 10), TODAY):
    check_in_factory(habit, user=late, created_at=at_noon(day))

  with _count_queries(test_engine) as queries_two:
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
    _add_member(test_engine, group, extra)

  with _count_queries(test_engine) as queries_six:
    response = client.get(
      f"/groups/{group.id}/habits/{habit.id}/stats",
      headers=_auth_headers(early),
    )

  assert response.status_code == 200
  assert len(response.json()["members"]) == 6
  assert len(queries_six) == len(queries_two)


def test_habit_stats_frozen_when_group_ended(
  client: TestClient,
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  check_in_factory,
) -> None:
  freeze_today(TODAY)
  ends_on = date(2026, 11, 5)
  group = _make_group(test_engine, ends_on=ends_on)
  admin = _create_user(test_engine, "admin")
  _add_member(test_engine, group, admin, role=GroupRole.ADMIN)
  habit = _make_group_habit(test_engine, group, starts_on=date(2026, 11, 1))

  check_in_factory(habit, user=admin, created_at=at_noon(date(2026, 11, 4)))
  check_in_factory(habit, user=admin, created_at=at_noon(ends_on))
  # Check-in após ends_on não deve entrar
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
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  user: User,
) -> None:
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  habit = _make_group_habit(test_engine, group, with_goal=False)

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
  test_engine: Engine,
  freeze_today: Callable[[date], None],
  user: User,
  other_user: User,
) -> None:
  freeze_today(TODAY)
  group_a = _make_group(test_engine)
  group_b = _make_group(test_engine)
  _add_member(test_engine, group_a, user, role=GroupRole.ADMIN)
  _add_member(test_engine, group_b, other_user, role=GroupRole.ADMIN)
  habit_a = _make_group_habit(test_engine, group_a)
  habit_b = _make_group_habit(test_engine, group_b)

  # 401 sem token
  resp = client.get(f"/groups/{group_a.id}/habits/{habit_a.id}/stats")
  assert resp.status_code == 401

  # 404 não membro
  resp = client.get(
    f"/groups/{group_a.id}/habits/{habit_a.id}/stats",
    headers=_auth_headers(other_user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_GROUP_NOT_FOUND

  # 404 grupo inexistente
  resp = client.get(
    f"/groups/{uuid4()}/habits/{habit_a.id}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_GROUP_NOT_FOUND

  # 404 hábito de outro grupo
  resp = client.get(
    f"/groups/{group_a.id}/habits/{habit_b.id}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_HABIT_NOT_FOUND

  # 404 hábito inexistente
  resp = client.get(
    f"/groups/{group_a.id}/habits/{uuid4()}/stats",
    headers=_auth_headers(user),
  )
  assert resp.status_code == 404
  assert resp.json()["detail"] == MSG_HABIT_NOT_FOUND

  # 422 ids inválidos
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
