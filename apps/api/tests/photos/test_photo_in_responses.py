"""FOTO-6: a foto nas respostas de check-in (detalhe, listas e feed do grupo)."""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date
from uuid import UUID

from sqlalchemy import Engine, event
from sqlmodel import Session

from app.group.models import Member
from app.photos import repository
from app.storage.dependencies import get_storage
from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.fixtures import TODAY, _add_member, _make_group, _make_group_habit


def _add_photo(engine: Engine, check_in_id: UUID) -> None:
  """Grava a foto no banco e os objetos no `FakeStorage` (a FOTO-5 não é necessária)."""
  full, thumb = f"full/{check_in_id}.jpg", f"thumb/{check_in_id}.jpg"
  storage = get_storage()
  storage.save(full, b"cheia", "image/jpeg")
  storage.save(thumb, b"mini", "image/jpeg")
  with Session(engine) as session:
    repository.upsert_photo(session, check_in_id, full, thumb)
    session.commit()


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


def test_detail_of_the_author_has_both_urls(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())
  _add_photo(test_engine, check_in.id)

  response = client.get(f"/check-ins/{check_in.id}", headers=auth_headers)

  photo = response.json()["photo"]
  assert response.status_code == 200
  assert photo["thumbnail_url"] and photo["url"]
  assert photo["thumbnail_url"] != photo["url"]


def test_check_in_without_photo_has_null_photo(
  client, auth_headers, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())

  response = client.get(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.json()["photo"] is None


def test_grouped_list_has_only_the_thumbnail(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory(), created_at=at_noon(date(2026, 10, 20)))
  _add_photo(test_engine, check_in.id)

  response = client.get("/check-ins", headers=auth_headers)

  item = next(iter(response.json()["items"][0].values()))[0]
  assert item["photo"]["thumbnail_url"]
  assert item["photo"]["url"] is None


def test_patch_returns_both_urls(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())
  _add_photo(test_engine, check_in.id)

  response = client.patch(
    f"/check-ins/{check_in.id}", json={"title": "Novo"}, headers=auth_headers
  )

  assert response.status_code == 200
  assert response.json()["photo"]["url"]


def test_public_personal_habit_shows_the_check_in_but_hides_the_photo(
  client, test_engine, other_auth_headers, habit_factory, check_in_factory
):
  habit = habit_factory(is_public=True)
  check_in = check_in_factory(habit)
  _add_photo(test_engine, check_in.id)

  response = client.get(f"/habits/{habit.id}/check-ins", headers=other_auth_headers)

  assert response.status_code == 200
  items = response.json()
  assert [item["id"] for item in items] == [str(check_in.id)]
  assert items[0]["photo"] is None


def test_group_member_sees_the_photo_of_a_mixed_check_in_until_leaving(
  client, test_engine, user, other_user, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  group_habit = _make_group_habit(test_engine, group)
  personal = habit_factory()
  check_in = check_in_factory([personal, group_habit])  # feito pelo `user`
  _add_photo(test_engine, check_in.id)
  url = f"/check-ins/{check_in.id}"

  seen = client.get(url, headers=_auth_headers(other_user))
  assert seen.status_code == 200
  assert seen.json()["photo"]["url"]

  with Session(test_engine) as db:
    db.delete(db.get(Member, (group.id, other_user.id)))
    db.commit()
  assert client.get(url, headers=_auth_headers(other_user)).status_code == 404

  outsider = _create_user(test_engine, "fora")
  assert client.get(url, headers=_auth_headers(outsider)).status_code == 404


def test_group_habit_history_shows_the_colleague_thumbnail_only(
  client, test_engine, user, other_user, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  habit = _make_group_habit(test_engine, group)
  check_in = check_in_factory(habit, user=user)
  _add_photo(test_engine, check_in.id)

  response = client.get(
    f"/habits/{habit.id}/check-ins", headers=_auth_headers(other_user)
  )

  assert response.json()[0]["photo"]["thumbnail_url"]
  assert response.json()[0]["photo"]["url"] is None


def test_group_feed_item_has_the_thumbnail(
  client, test_engine, user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  with_photo = check_in_factory(
    habit, user=user, created_at=at_noon(date(2026, 11, 10))
  )
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 11, 9)))
  _add_photo(test_engine, with_photo.id)

  response = client.get(f"/groups/{group.id}/check-ins", headers=auth_headers)

  items = response.json()["items"]
  assert items[0]["photo"]["thumbnail_url"]
  assert items[0]["photo"]["url"] is None
  assert items[1]["photo"] is None


def test_list_query_count_does_not_grow_with_the_number_of_photos(
  client, test_engine, habit_factory, check_in_factory
):
  def user_with(count: int) -> dict[str, str]:
    person = _create_user(test_engine, f"cheio{count}")
    habit = habit_factory(author=person)
    for index in range(count):
      check_in = check_in_factory(habit, created_at=at_noon(date(2026, 10, 1 + index)))
      _add_photo(test_engine, check_in.id)
    return _auth_headers(person)

  one, ten = user_with(1), user_with(10)

  with _count_queries(test_engine) as few:
    assert client.get("/check-ins", headers=one).status_code == 200
  with _count_queries(test_engine) as many:
    assert client.get("/check-ins", headers=ten).status_code == 200
  assert len(few) == len(many)
