"""FOTO-1 (seção 5): consultas de `app/photos/repository.py` no banco."""

from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

from sqlalchemy import Engine, event, func
from sqlmodel import Session, select

from app.photos import repository
from app.photos.models import CheckInPhoto


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


def _add_photo(engine: Engine, check_in_id: UUID, name: str) -> None:
  """Grava a foto do check-in com chaves derivadas de `name`."""
  with Session(engine) as session:
    repository.upsert_photo(session, check_in_id, f"full/{name}", f"thumb/{name}")
    session.commit()


def test_upsert_photo_twice_keeps_one_row_with_second_keys(
  test_engine, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())

  _add_photo(test_engine, check_in.id, "primeira.jpg")
  _add_photo(test_engine, check_in.id, "segunda.jpg")

  with Session(test_engine) as session:
    photos = session.exec(
      select(CheckInPhoto).where(CheckInPhoto.check_in_id == check_in.id)
    ).all()
    assert len(photos) == 1
    assert photos[0].full_key == "full/segunda.jpg"
    assert photos[0].thumbnail_key == "thumb/segunda.jpg"
    assert photos[0].updated_at > photos[0].created_at


def test_list_photos_by_check_in_ids_uses_one_query(
  test_engine, habit_factory, check_in_factory
):
  habit = habit_factory()
  com_foto_a, com_foto_b, sem_foto = (check_in_factory(habit) for _ in range(3))
  _add_photo(test_engine, com_foto_a.id, "a.jpg")
  _add_photo(test_engine, com_foto_b.id, "b.jpg")

  with Session(test_engine) as session, _count_selects(test_engine) as selects:
    photos = repository.list_photos_by_check_in_ids(
      session, [com_foto_a.id, com_foto_b.id, sem_foto.id]
    )

  assert set(photos) == {com_foto_a.id, com_foto_b.id}
  assert photos[com_foto_a.id].full_key == "full/a.jpg"
  assert len(selects) == 1

  # Lista vazia nem chega ao banco.
  with Session(test_engine) as session, _count_selects(test_engine) as selects:
    assert repository.list_photos_by_check_in_ids(session, []) == {}
  assert selects == []


def test_deleting_check_in_deletes_photo(
  client, auth_headers, test_engine, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())
  _add_photo(test_engine, check_in.id, "foto.jpg")

  response = client.delete(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.status_code == 204
  with Session(test_engine) as session:
    assert repository.get_photo(session, check_in.id) is None
    total = session.exec(select(func.count()).select_from(CheckInPhoto)).one()
    assert total == 0


def test_list_photo_keys_returns_both_keys_of_each_photo(
  test_engine, habit_factory, check_in_factory
):
  habit = habit_factory()
  primeiro, segundo, sem_foto = (check_in_factory(habit) for _ in range(3))
  _add_photo(test_engine, primeiro.id, "1.jpg")
  _add_photo(test_engine, segundo.id, "2.jpg")

  with Session(test_engine) as session:
    keys = repository.list_photo_keys(session, [primeiro.id, segundo.id, sem_foto.id])

  assert sorted(keys) == ["full/1.jpg", "full/2.jpg", "thumb/1.jpg", "thumb/2.jpg"]
