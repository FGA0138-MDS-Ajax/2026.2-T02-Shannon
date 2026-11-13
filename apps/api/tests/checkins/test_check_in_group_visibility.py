"""GRP-10 (seção 5): check-ins de hábito de grupo visíveis a membros do grupo."""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date

from sqlalchemy import Engine, event
from sqlmodel import Session

from app.checkins.models import CheckIn
from app.checkins.schemas import CheckInPublic
from app.checkins.service import build_check_ins_public
from app.group.models import GroupRole, Member
from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.test_group_habits import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
)


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


def _setup(test_engine, user, other_user, check_in_factory):
  """Grupo com `user` e `other_user`; o colega faz um check-in no hábito do grupo."""
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)
  check_in = check_in_factory(
    habit,
    user=other_user,
    title="Check-in do colega",
    created_at=at_noon(date(2026, 11, 10)),
  )
  return group, habit, check_in


# GET /habits/{id}/check-ins


def test_habit_check_ins_member_sees_colleague_with_habit_ids(
  client, test_engine, user, other_user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, habit, check_in = _setup(test_engine, user, other_user, check_in_factory)

  response = client.get(f"/habits/{habit.id}/check-ins", headers=auth_headers)

  assert response.status_code == 200
  item = response.json()[0]
  assert item["id"] == str(check_in.id)
  assert item["user_id"] == str(other_user.id)
  assert item["habit_ids"] == [str(habit.id)]


def test_habit_check_ins_non_member_gets_404(
  client, test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, habit, _ = _setup(test_engine, user, other_user, check_in_factory)
  outsider = _create_user(test_engine, "fora")

  response = client.get(
    f"/habits/{habit.id}/check-ins", headers=_auth_headers(outsider)
  )

  assert response.status_code == 404


def test_habit_check_ins_ex_member_gets_404(
  client, test_engine, user, other_user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group, habit, _ = _setup(test_engine, user, other_user, check_in_factory)
  with Session(test_engine) as db:
    db.delete(db.get(Member, (group.id, user.id)))
    db.commit()

  response = client.get(f"/habits/{habit.id}/check-ins", headers=auth_headers)

  assert response.status_code == 404


# GET /check-ins/{id}


def test_get_check_in_member_sees_colleague_check_in_with_habit_ids(
  client, test_engine, user, other_user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, habit, check_in = _setup(test_engine, user, other_user, check_in_factory)

  response = client.get(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.status_code == 200
  assert response.json()["habit_ids"] == [str(habit.id)]


def test_get_check_in_non_member_gets_404(
  client, test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, _, check_in = _setup(test_engine, user, other_user, check_in_factory)
  outsider = _create_user(test_engine, "fora")

  response = client.get(f"/check-ins/{check_in.id}", headers=_auth_headers(outsider))

  assert response.status_code == 404


# PATCH e DELETE /check-ins/{id}: só quem fez; o colega vê, mas não altera


def test_patch_and_delete_colleague_check_in_gives_403_to_member(
  client, test_engine, user, other_user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, _, check_in = _setup(test_engine, user, other_user, check_in_factory)
  url = f"/check-ins/{check_in.id}"

  assert client.patch(url, json={"title": "x"}, headers=auth_headers).status_code == 403
  assert client.delete(url, headers=auth_headers).status_code == 403
  with Session(test_engine) as db:
    assert db.get(CheckIn, check_in.id) is not None


def test_patch_and_delete_colleague_check_in_gives_404_to_non_member(
  client, test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  _, _, check_in = _setup(test_engine, user, other_user, check_in_factory)
  headers = _auth_headers(_create_user(test_engine, "fora"))
  url = f"/check-ins/{check_in.id}"

  assert client.patch(url, json={"title": "x"}, headers=headers).status_code == 404
  assert client.delete(url, headers=headers).status_code == 404


def test_author_can_patch_and_delete_own_group_check_in(
  client,
  test_engine,
  user,
  other_user,
  other_auth_headers,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  _, habit, check_in = _setup(test_engine, user, other_user, check_in_factory)
  url = f"/check-ins/{check_in.id}"

  patched = client.patch(url, json={"title": "Novo"}, headers=other_auth_headers)
  assert patched.status_code == 200
  assert patched.json()["title"] == "Novo"
  assert patched.json()["habit_ids"] == [str(habit.id)]
  assert client.delete(url, headers=other_auth_headers).status_code == 204


# POST /check-ins: o progresso e os habit_ids da resposta


def test_post_check_in_in_group_habit_returns_habit_ids(
  client, test_engine, user, other_user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)

  response = client.post(
    "/check-ins",
    json={"title": "Corrida", "habit_ids": [str(habit.id)]},
    headers=auth_headers,
  )

  assert response.status_code == 201, response.text
  assert response.json()["habit_ids"] == [str(habit.id)]
  assert len(response.json()["progress"]) == 1


# Mistura: o colega vê só o que pode


def test_check_in_with_group_and_private_personal_habit_hides_the_private_one(
  client,
  test_engine,
  user,
  other_user,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  group, group_habit, _ = _setup(test_engine, user, other_user, check_in_factory)
  private_habit = habit_factory(author=other_user, name="Privado do colega")
  check_in = check_in_factory(
    [group_habit, private_habit], user=other_user, title="Dois hábitos"
  )

  response = client.get(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.status_code == 200
  assert response.json()["habit_ids"] == [str(group_habit.id)]


# Número de consultas


def _build(db: Session, check_ins: list[CheckIn], user) -> list[CheckInPublic]:
  return build_check_ins_public(db, check_ins, user)


def test_build_check_ins_public_queries_groups_only_for_group_habits(
  test_engine, user, other_user, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory(author=other_user, is_public=True)
  personal_check_in = check_in_factory(personal, user=other_user)
  _, _, group_check_in = _setup(test_engine, user, other_user, check_in_factory)

  with Session(test_engine) as db, _count_selects(test_engine) as personal_statements:
    _build(db, [personal_check_in], user)
  with Session(test_engine) as db, _count_selects(test_engine) as group_statements:
    _build(db, [group_check_in], user)

  assert not any("group_members" in st for st in personal_statements)
  assert any("group_members" in st for st in group_statements)
  assert len(group_statements) == len(personal_statements) + 1


# Seção 5, passo C: regressões (devem passar antes e depois da mudança)


def test_own_check_in_shows_every_habit_id(
  client, test_engine, user, other_user, auth_headers, habit_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group)
  private_habit = habit_factory(name="Privado meu")
  foreign_group = _make_group(test_engine)
  _add_member(test_engine, foreign_group, other_user)
  foreign_habit = _make_group_habit(test_engine, foreign_group, name="De outro grupo")

  response = client.post(
    "/check-ins",
    json={
      "title": "Tudo junto",
      "habit_ids": [str(group_habit.id), str(private_habit.id)],
    },
    headers=auth_headers,
  )

  assert response.status_code == 201, response.text
  assert set(response.json()["habit_ids"]) == {
    str(group_habit.id),
    str(private_habit.id),
  }
  assert str(foreign_habit.id) not in response.json()["habit_ids"]
  listing = client.get(f"/habits/{private_habit.id}/check-ins", headers=auth_headers)
  assert set(listing.json()[0]["habit_ids"]) == {
    str(group_habit.id),
    str(private_habit.id),
  }


def test_public_personal_habit_history_is_unchanged(
  client, user, other_user, auth_headers, habit_factory, check_in_factory
):
  public_habit = habit_factory(author=other_user, is_public=True, name="Público")
  private_habit = habit_factory(author=other_user, name="Privado")
  check_in = check_in_factory(
    [public_habit, private_habit], user=other_user, title="Do colega"
  )

  response = client.get(f"/habits/{public_habit.id}/check-ins", headers=auth_headers)

  assert response.status_code == 200
  assert [item["id"] for item in response.json()] == [str(check_in.id)]
  assert response.json()[0]["habit_ids"] == [str(public_habit.id)]


# Seção 5, passo C: visibilidade fina e número de consultas


def test_colleague_check_in_hides_his_private_personal_habit(
  client,
  test_engine,
  user,
  other_user,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  group, group_habit, _ = _setup(test_engine, user, other_user, check_in_factory)
  private_habit = habit_factory(author=other_user, name="Privado do colega")
  check_in_factory([group_habit, private_habit], user=other_user, title="Misto")

  history = client.get(f"/habits/{group_habit.id}/check-ins", headers=auth_headers)

  assert history.status_code == 200
  mixed = next(i for i in history.json() if i["title"] == "Misto")
  assert mixed["habit_ids"] == [str(group_habit.id)]


def test_colleague_check_in_hides_group_habit_of_a_group_the_user_is_not_in(
  client,
  test_engine,
  user,
  other_user,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  public_habit = habit_factory(author=other_user, is_public=True, name="Público")
  foreign_group = _make_group(test_engine)
  _add_member(test_engine, foreign_group, other_user)
  foreign_habit = _make_group_habit(test_engine, foreign_group, name="De outro grupo")
  check_in_factory([public_habit, foreign_habit], user=other_user, title="Dois mundos")

  history = client.get(f"/habits/{public_habit.id}/check-ins", headers=auth_headers)

  assert history.status_code == 200
  assert history.json()[0]["habit_ids"] == [str(public_habit.id)]


def test_admin_and_member_see_the_same_habit_ids_of_colleagues(
  client, test_engine, user, other_user, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user, role=GroupRole.ADMIN)
  _add_member(test_engine, group, other_user)
  third = _create_user(test_engine, "terceiro")
  _add_member(test_engine, group, third)
  habit_a = _make_group_habit(test_engine, group, name="A")
  habit_b = _make_group_habit(test_engine, group, name="B")
  check_in_factory([habit_a, habit_b], user=third, title="Do terceiro")

  def seen(who) -> set[str]:
    response = client.get(f"/habits/{habit_a.id}/check-ins", headers=_auth_headers(who))
    assert response.status_code == 200
    return {hid for item in response.json() for hid in item["habit_ids"]}

  assert seen(user) == seen(other_user) == {str(habit_a.id), str(habit_b.id)}


def test_own_check_ins_do_not_query_membership(
  client, test_engine, user, auth_headers, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory()
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group)
  own_personal = check_in_factory(personal, user=user, title="Próprio pessoal")
  own_group = check_in_factory(
    [personal, group_habit], user=user, title="Próprio grupo"
  )

  measured = {}
  for label, check_in in (("pessoal", own_personal), ("grupo", own_group)):
    with Session(test_engine) as db, _count_selects(test_engine) as statements:
      build_check_ins_public(db, [check_in], user)
    measured[label] = len(statements)
    assert not any("group_members" in st for st in statements), label

  with _count_selects(test_engine) as route_statements:
    response = client.post(
      "/check-ins",
      json={"title": "Via rota", "habit_ids": [str(group_habit.id)]},
      headers=auth_headers,
    )
  assert response.status_code == 201, response.text
  assert set(response.json()["habit_ids"]) == {str(group_habit.id)}
  print(
    "SELECTs build_check_ins_public (check-in próprio): "
    f"{measured};"
    f" POST /check-ins inteiro (hábito de grupo)={len(route_statements)}"
  )


def test_colleague_check_ins_in_group_habit_cost_one_extra_query(
  test_engine, user, other_user, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  personal = habit_factory(author=other_user, is_public=True)
  personal_check_in = check_in_factory(personal, user=other_user)
  _, _, group_check_in = _setup(test_engine, user, other_user, check_in_factory)

  with Session(test_engine) as db, _count_selects(test_engine) as personal_sql:
    build_check_ins_public(db, [personal_check_in], user)
  with Session(test_engine) as db, _count_selects(test_engine) as group_sql:
    build_check_ins_public(db, [group_check_in], user)

  print(f"SELECTs de outros: pessoal={len(personal_sql)} grupo={len(group_sql)}")
  assert not any("group_members" in st for st in personal_sql)
  assert len(group_sql) == len(personal_sql) + 1


def test_habit_history_query_count_does_not_grow_with_check_ins_and_members(
  client, test_engine, user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  members = [user]
  for index in range(4):
    member = _create_user(test_engine, f"colega{index}")
    _add_member(test_engine, group, member)
    members.append(member)

  def measure() -> tuple[int, int]:
    with _count_selects(test_engine) as statements:
      response = client.get(f"/habits/{habit.id}/check-ins", headers=auth_headers)
    assert response.status_code == 200
    assert all(item["habit_ids"] == [str(habit.id)] for item in response.json())
    return len(response.json()), len(statements)

  for index in range(3):
    check_in_factory(habit, user=members[index % 5], title=f"c{index}")
  few_items, few_queries = measure()
  for index in range(27):
    check_in_factory(habit, user=members[index % 5], title=f"d{index}")
  many_items, many_queries = measure()

  print(
    f"\nSELECTs GET /habits/{{id}}/check-ins: {few_items} check-ins={few_queries};"
    f" {many_items} check-ins de 5 membros={many_queries}"
  )
  assert (few_items, many_items) == (3, 30)
  assert few_queries == many_queries
