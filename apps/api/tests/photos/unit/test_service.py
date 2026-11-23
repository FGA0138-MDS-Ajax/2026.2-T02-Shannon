import logging
from datetime import UTC, date, datetime
from uuid import uuid4

from app.checkins.models import CheckIn
from app.photos.models import CheckInPhoto
from app.photos.service import (
  build_photo_keys,
  delete_objects_safely,
  is_check_in_from_today,
  photo_public,
)
from app.storage.fake import FakeStorage


def test_build_photo_keys_uses_same_uuid_and_changes_each_call():
  check_in_id = uuid4()

  full_1, thumb_1 = build_photo_keys(check_in_id)
  full_2, thumb_2 = build_photo_keys(check_in_id)

  prefix = f"check-ins/{check_in_id}/"
  assert full_1.startswith(prefix) and full_1.endswith("-full.jpg")
  assert thumb_1.startswith(prefix) and thumb_1.endswith("-thumb.jpg")
  assert full_1.removesuffix("-full.jpg") == thumb_1.removesuffix("-thumb.jpg")
  assert (full_1, thumb_1) != (full_2, thumb_2)


def test_is_check_in_from_today_respects_app_timezone():
  # 01:30 UTC do dia 23 ainda é 22:30 do dia 22 em America/Sao_Paulo (-03:00).
  check_in = CheckIn(
    user_id=uuid4(),
    title="Treino",
    created_at=datetime(2026, 11, 23, 1, 30, tzinfo=UTC),
  )

  assert is_check_in_from_today(check_in, date(2026, 11, 22)) is True
  assert is_check_in_from_today(check_in, date(2026, 11, 23)) is False


def test_delete_objects_safely_removes_keys_and_ignores_storage_error(caplog):
  storage = FakeStorage()
  storage.save("a.jpg", b"1", "image/jpeg")
  storage.save("b.jpg", b"2", "image/jpeg")

  delete_objects_safely(storage, ["a.jpg"])
  assert list(storage.objects) == ["b.jpg"]

  storage.fail_on_delete = True
  with caplog.at_level(logging.WARNING):
    delete_objects_safely(storage, ["b.jpg"])

  assert "b.jpg" in storage.objects
  assert "b.jpg" in caplog.text


def test_photo_public_controls_full_url():
  storage = FakeStorage()
  photo = CheckInPhoto(
    check_in_id=uuid4(),
    full_key="check-ins/1/a-full.jpg",
    thumbnail_key="check-ins/1/a-thumb.jpg",
  )

  with_full = photo_public(storage, photo, include_full=True)
  assert with_full.thumbnail_url == storage.presigned_url(photo.thumbnail_key)
  assert with_full.url == storage.presigned_url(photo.full_key)

  thumb_only = photo_public(storage, photo, include_full=False)
  assert thumb_only.thumbnail_url == storage.presigned_url(photo.thumbnail_key)
  assert thumb_only.url is None
