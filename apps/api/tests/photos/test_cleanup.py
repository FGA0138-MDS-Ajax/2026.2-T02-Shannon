"""FOTO-7 (seção 4): limpeza na exclusão de check-in e varredor de órfãos."""

from datetime import UTC, datetime, timedelta
from io import BytesIO

import pytest
from PIL import Image
from sqlmodel import Session

from app.checkins import service as checkins_service
from app.photos import service as photos_service
from app.photos.repository import get_photo
from app.photos.sweep import SweepResult, sweep_orphan_photos
from app.storage.fake import FakeStorage


def _jpeg() -> bytes:
  buffer = BytesIO()
  Image.new("RGB", (100, 100), (200, 30, 30)).save(buffer, "JPEG")
  return buffer.getvalue()


@pytest.fixture
def fake_storage(monkeypatch: pytest.MonkeyPatch) -> FakeStorage:
  """Garante `FakeStorage` isolado em checkins e photos mesmo com `.env` em R2."""
  storage = FakeStorage()
  monkeypatch.setattr(checkins_service, "get_storage", lambda: storage)
  monkeypatch.setattr(photos_service, "get_storage", lambda: storage)
  return storage


def test_delete_check_in_removes_photo_objects(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())
  put_response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files={"photo": ("foto.jpg", _jpeg(), "image/jpeg")},
  )
  assert put_response.status_code == 200
  assert len(fake_storage.objects) == 2

  delete_response = client.delete(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert delete_response.status_code == 204
  assert fake_storage.objects == {}
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None


def test_delete_check_in_succeeds_even_when_storage_delete_fails(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())
  put_response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files={"photo": ("foto.jpg", _jpeg(), "image/jpeg")},
  )
  assert put_response.status_code == 200
  keys_before = set(fake_storage.objects)

  fake_storage.fail_on_delete = True
  delete_response = client.delete(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert delete_response.status_code == 204
  assert set(fake_storage.objects) == keys_before
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None


def test_sweep_deletes_only_old_orphan(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  now = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
  check_in = check_in_factory(habit_factory())
  put_response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files={"photo": ("foto.jpg", _jpeg(), "image/jpeg")},
  )
  assert put_response.status_code == 200
  registered_keys = set(fake_storage.objects)

  old_orphan = "check-ins/orfao/antigo-full.jpg"
  recent_orphan = "check-ins/orfao/recente-full.jpg"
  fake_storage.save(old_orphan, b"old", "image/jpeg")
  fake_storage.save(recent_orphan, b"recent", "image/jpeg")
  fake_storage.set_last_modified(old_orphan, now - timedelta(hours=25))
  fake_storage.set_last_modified(recent_orphan, now - timedelta(hours=1))

  with Session(test_engine) as session:
    result = sweep_orphan_photos(session, fake_storage, now)

  assert result == SweepResult(listed=4, orphans=1, deleted=1)
  assert old_orphan not in fake_storage.objects
  assert recent_orphan in fake_storage.objects
  assert registered_keys.issubset(fake_storage.objects)


def test_sweep_dry_run_counts_without_deleting(test_engine, fake_storage):
  now = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
  old_orphan = "check-ins/orfao/antigo-full.jpg"
  fake_storage.save(old_orphan, b"old", "image/jpeg")
  fake_storage.set_last_modified(old_orphan, now - timedelta(hours=25))

  with Session(test_engine) as session:
    result = sweep_orphan_photos(session, fake_storage, now, dry_run=True)

  assert result == SweepResult(listed=1, orphans=1, deleted=0)
  assert old_orphan in fake_storage.objects
