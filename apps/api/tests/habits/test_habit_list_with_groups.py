"""GRP-10: lista pessoal com hábitos de grupo e rotas pessoais em hábito de grupo."""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date

import pytest
from sqlalchemy import Engine, event
from sqlmodel import Session

from app.auth.models import User
from app.group.models import Group, GroupRole, Member
from app.habits import service as habits_service
from app.habits.exceptions import (
  MSG_GROUP_HABIT_FORBIDDEN,
  MSG_HABIT_FORBIDDEN,
  MSG_HABIT_NOT_FOUND,
)
from app.habits.models import Habit, HabitStatus
from app.habits.repository import list_habits_for_user_with_groups
from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.test_group_habits import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
)


def _leave(engine: Engine, group: Group, user: User) -> None:
  with Session(engine) as session:
    session.delete(session.get(Member, (group.id, user.id)))
    session.commit()


def _ids(habits: list[Habit]) -> list:
  return [habit.id for habit in habits]


@contextmanager
def _count_selects(engine: Engine) -> Iterator[list[str]]:
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    if statement.lstrip().upper().startswith("SELECT"):
      statements.append(statement)

  event.listen(engine, "before_cursor_execute", before_execute)
  try:
    yield statements
  finally:
    event.remove(engine, "before_cursor_execute", before_execute)


# D) list_habits_for_user_with_groups


def test_repo_lists_own_and_member_group_habits_only(
  test_engine, user, other_user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  own = habit_factory(name="Meu")
  habit_factory(author=other_user, is_public=True, name="Público de outro")
  habit_factory(author=other_user, name="Privado de outro")
  my_group = _make_group(test_engine)
  _add_member(test_engine, my_group, user)
  group_habit = _make_group_habit(test_engine, my_group)
  foreign_group = _make_group(test_engine)
  _add_member(test_engine, foreign_group, other_user)
  _make_group_habit(test_engine, foreign_group, name="De outro grupo")

  with Session(test_engine) as db:
    habits = list_habits_for_user_with_groups(db, user.id)

  assert set(_ids(habits)) == {own.id, group_habit.id}


def test_repo_status_filter_applies_to_both_types(
  test_engine, user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  active_personal = habit_factory(name="Pessoal ativo")
  finished_personal = habit_factory(name="Pessoal encerrado", finished=True)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  active_group = _make_group_habit(test_engine, group, name="Grupo ativo")
  finished_group = _make_group_habit(
    test_engine,
    group,
    name="Grupo encerrado",
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )

  with Session(test_engine) as db:
    active = list_habits_for_user_with_groups(db, user.id, HabitStatus.ACTIVE)
    finished = list_habits_for_user_with_groups(db, user.id, HabitStatus.FINISHED)
    everything = list_habits_for_user_with_groups(db, user.id)

  assert set(_ids(active)) == {active_personal.id, active_group.id}
  assert set(_ids(finished)) == {finished_personal.id, finished_group.id}
  assert len(everything) == 4


def test_repo_orders_by_created_at_desc_then_name_across_types(
  test_engine, user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  newest = habit_factory(name="Z pessoal", created_at=date(2026, 11, 8))
  tie_b = habit_factory(name="B pessoal", created_at=date(2026, 11, 5))
  tie_a = _make_group_habit(
    test_engine, group, name="A grupo", starts_on=date(2026, 11, 5)
  )
  oldest = _make_group_habit(
    test_engine, group, name="C grupo", starts_on=date(2026, 11, 1)
  )

  with Session(test_engine) as db:
    habits = list_habits_for_user_with_groups(db, user.id)

  assert _ids(habits) == [newest.id, tie_a.id, tie_b.id, oldest.id]


def test_repo_user_who_left_no_longer_sees_group_habit(
  test_engine, user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  own = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _make_group_habit(test_engine, group)
  _leave(test_engine, group, user)

  with Session(test_engine) as db:
    assert _ids(list_habits_for_user_with_groups(db, user.id)) == [own.id]


def test_repo_user_without_groups_gets_only_personal(
  test_engine, user, other_user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  own = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, other_user)
  _make_group_habit(test_engine, group)

  with Session(test_engine) as db:
    assert _ids(list_habits_for_user_with_groups(db, user.id)) == [own.id]


# E) list_my_habits (estatísticas) sem mudança


def test_list_my_habits_still_returns_only_personal_habits(
  test_engine, user, habit_factory, freeze_today
):
  freeze_today(TODAY)
  own = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  _make_group_habit(test_engine, group)

  with Session(test_engine) as db:
    habits = habits_service.list_my_habits(db, user)

  assert _ids(habits) == [own.id]


# H) GET /habits


def test_get_habits_status_finished_includes_finished_group_habit(
  client, test_engine, user, auth_headers, habit_factory, freeze_today
):
  freeze_today(TODAY)
  finished_personal = habit_factory(finished=True)
  habit_factory(name="Ativo")
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _make_group_habit(test_engine, group, name="Grupo ativo")
  finished_group = _make_group_habit(
    test_engine,
    group,
    name="Grupo encerrado",
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )

  response = client.get("/habits?status=finished", headers=auth_headers)

  assert response.status_code == 200
  body = {item["id"]: item for item in response.json()}
  assert set(body) == {str(finished_personal.id), str(finished_group.id)}
  assert body[str(finished_group.id)]["group"]["id"] == str(group.id)
  assert body[str(finished_personal.id)]["group"] is None


def test_get_habits_after_leaving_group_hides_group_habit(
  client, test_engine, user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  assert [i["id"] for i in client.get("/habits", headers=auth_headers).json()] == [
    str(habit.id)
  ]

  _leave(test_engine, group, user)

  assert client.get("/habits", headers=auth_headers).json() == []


def test_get_habits_progress_belongs_to_the_requesting_member(
  client, test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)
  for day in (8, 9, 10):
    check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, day)))
  check_in_factory(habit, user=other_user, created_at=at_noon(date(2026, 11, 10)))

  mine = client.get("/habits", headers=_auth_headers(user)).json()[0]
  theirs = client.get("/habits", headers=_auth_headers(other_user)).json()[0]

  assert mine["progress"]["current_streak"] == 3
  assert theirs["progress"]["current_streak"] == 1


# I) GET /habits/{id}


def test_get_habit_member_sees_group_habit(
  client, test_engine, user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)

  response = client.get(f"/habits/{habit.id}", headers=auth_headers)

  assert response.status_code == 200
  body = response.json()
  assert body["author_user_id"] is None
  assert body["author_group_id"] == str(group.id)


def test_get_habit_member_sees_group_filled(
  client, test_engine, user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)

  body = client.get(f"/habits/{habit.id}", headers=auth_headers).json()

  assert body["group"] == {"id": str(group.id), "name": "Grupo Teste"}


def test_get_habit_non_member_and_ex_member_get_404(
  client, test_engine, user, auth_headers, other_user, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)

  response = client.get(f"/habits/{habit.id}", headers=auth_headers)
  assert response.status_code == 404
  assert response.json()["detail"] == MSG_HABIT_NOT_FOUND

  _leave(test_engine, group, other_user)
  response = client.get(f"/habits/{habit.id}", headers=_auth_headers(other_user))
  assert response.status_code == 404


# J) escrita pela rota pessoal em hábito de grupo


@pytest.mark.parametrize(
  ("method", "suffix", "body"),
  [
    ("patch", "", {"name": "Novo nome"}),
    ("post", "/finish", None),
    ("delete", "", None),
  ],
)
def test_personal_write_routes_on_group_habit(
  client, test_engine, user, other_user, freeze_today, method, suffix, body
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  _add_member(test_engine, group, other_user)
  outsider = _create_user(test_engine, "fora")
  habit = _make_group_habit(test_engine, group)
  url = f"/habits/{habit.id}{suffix}"

  def call(who: User):
    kwargs = {"headers": _auth_headers(who)}
    if body is not None:
      kwargs["json"] = body
    return getattr(client, method)(url, **kwargs)

  for who in (user, other_user):
    response = call(who)
    assert response.status_code == 403, (who.username, response.text)
    assert response.json()["detail"] == MSG_GROUP_HABIT_FORBIDDEN

  assert call(outsider).status_code == 404

  with Session(test_engine) as db:
    saved = db.get(Habit, habit.id)
    assert saved is not None
    assert saved.name == "Hábito do grupo"
    assert saved.status == HabitStatus.ACTIVE


# M) número de consultas


def _make_member_with_groups(
  engine: Engine, prefix: str, groups: int, habits_per_group: int, members: int
) -> User:
  owner = _create_user(engine, prefix)
  for g in range(groups):
    group = _make_group(engine)
    _add_member(engine, group, owner)
    for m in range(members):
      _add_member(engine, group, _create_user(engine, f"{prefix}_m{g}_{m}"))
    for h in range(habits_per_group):
      _make_group_habit(engine, group, name=f"G{g} H{h}")
  return owner


def test_get_habits_query_count_is_fixed(
  client, test_engine, habit_factory, goal_factory, freeze_today
):
  freeze_today(TODAY)
  no_groups = _create_user(test_engine, "semgrupo")
  one_group = _make_member_with_groups(test_engine, "um", 1, 1, 0)
  three_groups = _make_member_with_groups(test_engine, "tres", 3, 3, 2)
  for owner in (no_groups, one_group, three_groups):
    goal_factory(habit_factory(author=owner))

  counts = {}
  for label, owner, expected_items in (
    ("a_sem_grupos", no_groups, 1),
    ("b_1_grupo", one_group, 2),
    ("c_3_grupos", three_groups, 10),
  ):
    headers = _auth_headers(owner)
    with _count_selects(test_engine) as statements:
      response = client.get("/habits", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == expected_items
    counts[label] = len(statements)

  print(f"\nSELECTs em GET /habits: {counts}")
  assert counts["b_1_grupo"] == counts["c_3_grupos"]
  assert counts["a_sem_grupos"] <= counts["b_1_grupo"]


def test_get_habit_by_id_query_count(
  client, test_engine, user, auth_headers, habit_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group)

  with _count_selects(test_engine) as personal_statements:
    assert client.get(f"/habits/{personal.id}", headers=auth_headers).status_code == 200
  with _count_selects(test_engine) as group_statements:
    assert (
      client.get(f"/habits/{group_habit.id}", headers=auth_headers).status_code == 200
    )

  print(
    f"\nSELECTs em GET /habits/{{id}}: pessoal={len(personal_statements)}"
    f" grupo={len(group_statements)}"
  )
  assert not any("group_members" in st for st in personal_statements)
  # + participação (get_visible_habit) + o próprio grupo (campo `group`)
  assert len(group_statements) == len(personal_statements) + 2


def test_finish_already_finished_group_habit_gives_403_to_member(
  client, test_engine, user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(
    test_engine,
    group,
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )

  response = client.post(f"/habits/{habit.id}/finish", headers=auth_headers)

  # a checagem de acesso vem antes do "já encerrado": 403, não 409
  assert response.status_code == 403
  assert response.json()["detail"] == MSG_GROUP_HABIT_FORBIDDEN


@pytest.mark.parametrize(
  ("method", "suffix", "body"),
  [
    ("patch", "", {"name": "Novo nome"}),
    ("post", "/finish", None),
    ("delete", "", None),
  ],
)
def test_personal_habit_of_another_user_keeps_the_generic_403(
  client, test_engine, user, other_user, habit_factory, method, suffix, body
):
  habit = habit_factory(author=other_user, is_public=True)
  kwargs = {"headers": _auth_headers(user)}
  if body is not None:
    kwargs["json"] = body

  response = getattr(client, method)(f"/habits/{habit.id}{suffix}", **kwargs)

  assert response.status_code == 403
  assert response.json()["detail"] == MSG_HABIT_FORBIDDEN


def test_get_habit_personal_has_null_group(client, user, auth_headers, habit_factory):
  habit = habit_factory()

  body = client.get(f"/habits/{habit.id}", headers=auth_headers).json()

  assert body["group"] is None
  assert body["author_user_id"] == str(user.id)
