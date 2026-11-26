"""FOTO-7 (seção 4): testes unitários de `find_orphan_keys` (sem Docker)."""

from datetime import UTC, datetime, timedelta

from app.photos.sweep import find_orphan_keys
from app.storage.base import StoredObject

NOW = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
MIN_AGE = timedelta(hours=24)


def test_registered_old_object_is_not_orphan():
  key = "check-ins/1/a-full.jpg"
  objects = [StoredObject(key=key, last_modified=NOW - timedelta(hours=48))]

  assert find_orphan_keys(objects, {key}, NOW, MIN_AGE) == []


def test_unregistered_object_older_than_24h_is_orphan():
  key = "check-ins/1/orfao-antigo.jpg"
  objects = [StoredObject(key=key, last_modified=NOW - timedelta(hours=25))]

  assert find_orphan_keys(objects, set(), NOW, MIN_AGE) == [key]


def test_unregistered_recent_object_is_not_orphan():
  key = "check-ins/1/envio-em-andamento.jpg"
  objects = [StoredObject(key=key, last_modified=NOW - timedelta(hours=1))]

  assert find_orphan_keys(objects, set(), NOW, MIN_AGE) == []


def test_empty_list_returns_no_orphans():
  assert find_orphan_keys([], {"check-ins/1/a-full.jpg"}, NOW, MIN_AGE) == []
