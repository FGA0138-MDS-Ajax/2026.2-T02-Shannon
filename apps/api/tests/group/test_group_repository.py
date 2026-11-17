from datetime import date
from uuid import uuid4

from sqlalchemy import Engine, event
from sqlmodel import Session

from app.group.models import Group, RankingCriterion
from app.group.repository import list_groups_by_ids
from tests.conftest import _save


def _make_group(engine: Engine, name: str) -> Group:
  return _save(
    engine,
    Group(
      name=name,
      starts_on=date(2026, 10, 1),
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code=uuid4().hex[:8].upper(),
    ),
  )


def test_list_groups_by_ids_empty_input_does_not_query(test_engine):
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    statements.append(statement)

  event.listen(test_engine, "before_cursor_execute", before_execute)
  try:
    with Session(test_engine) as db:
      assert list_groups_by_ids(db, []) == []
  finally:
    event.remove(test_engine, "before_cursor_execute", before_execute)

  assert statements == []


def test_list_groups_by_ids_returns_only_the_requested_subset(test_engine):
  first = _make_group(test_engine, "Primeiro")
  second = _make_group(test_engine, "Segundo")
  _make_group(test_engine, "Terceiro")

  with Session(test_engine) as db:
    groups = list_groups_by_ids(db, [first.id, second.id])

  assert {group.id for group in groups} == {first.id, second.id}


def test_list_groups_by_ids_ignores_unknown_ids(test_engine):
  group = _make_group(test_engine, "Existente")

  with Session(test_engine) as db:
    groups = list_groups_by_ids(db, [group.id, uuid4()])

  assert [g.id for g in groups] == [group.id]


def test_list_groups_by_ids_does_not_duplicate_repeated_ids(test_engine):
  group = _make_group(test_engine, "Repetido")

  with Session(test_engine) as db:
    groups = list_groups_by_ids(db, [group.id, group.id, group.id])

  assert [g.id for g in groups] == [group.id]
