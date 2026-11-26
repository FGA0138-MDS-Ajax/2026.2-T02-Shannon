"""FOTO-5 (seção 7): testes das rotas `PUT` e `DELETE /check-ins/{id}/photo`."""

from datetime import timedelta
from io import BytesIO

import pytest
from PIL import Image
from sqlmodel import Session

from app.checkins.exceptions import MSG_CHECK_IN_FORBIDDEN, MSG_CHECK_IN_NOT_FOUND
from app.checkins.models import CheckIn
from app.habits.service import today
from app.photos import service as photos_service
from app.photos.exceptions import (
  MSG_PHOTO_INVALID,
  MSG_PHOTO_NOT_TODAY,
  MSG_PHOTO_STORAGE_FAILED,
  MSG_PHOTO_TOO_LARGE,
  MSG_PHOTO_UNSUPPORTED,
)
from app.photos.repository import get_photo
from app.storage.fake import FakeStorage
from tests.conftest import at_noon


def _jpeg(size: tuple[int, int] = (100, 100)) -> bytes:
  buffer = BytesIO()
  Image.new("RGB", size, (200, 30, 30)).save(buffer, "JPEG")
  return buffer.getvalue()


def _upload_file(content: bytes, filename: str = "foto.jpg", mime: str = "image/jpeg"):
  return {"photo": (filename, content, mime)}


@pytest.fixture
def fake_storage(monkeypatch: pytest.MonkeyPatch) -> FakeStorage:
  """Garante `FakeStorage` isolado mesmo se o `.env` apontar para o R2."""
  storage = FakeStorage()
  monkeypatch.setattr(photos_service, "get_storage", lambda: storage)
  return storage


def test_put_photo_uploads_two_objects_and_saves_keys(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())

  response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )

  assert response.status_code == 200
  assert len(fake_storage.objects) == 2

  with Session(test_engine) as session:
    photo = get_photo(session, check_in.id)

  assert photo is not None
  assert set(fake_storage.objects) == {photo.full_key, photo.thumbnail_key}
  assert response.json() == {
    "thumbnail_url": fake_storage.presigned_url(photo.thumbnail_key),
    "url": fake_storage.presigned_url(photo.full_key),
  }


def test_put_photo_replaces_old_objects_and_updates_keys(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())

  first = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert first.status_code == 200
  old_keys = set(fake_storage.objects)

  second = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg((200, 200))),
  )
  assert second.status_code == 200
  new_keys = set(fake_storage.objects)

  assert len(new_keys) == 2
  assert new_keys.isdisjoint(old_keys)

  with Session(test_engine) as session:
    photo = get_photo(session, check_in.id)

  assert photo is not None
  assert {photo.full_key, photo.thumbnail_key} == new_keys


def test_delete_photo_removes_objects_and_is_idempotent(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())
  put_response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert put_response.status_code == 200

  first_delete = client.delete(f"/check-ins/{check_in.id}/photo", headers=auth_headers)
  assert first_delete.status_code == 204
  assert fake_storage.objects == {}
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None

  second_delete = client.delete(f"/check-ins/{check_in.id}/photo", headers=auth_headers)
  assert second_delete.status_code == 204
  assert fake_storage.objects == {}


def test_yesterday_check_in_returns_409_on_put_and_delete(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  yesterday = today() - timedelta(days=1)
  check_in = check_in_factory(habit_factory(), created_at=at_noon(yesterday))

  put_response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert put_response.status_code == 409
  assert put_response.json()["detail"] == MSG_PHOTO_NOT_TODAY

  delete_response = client.delete(
    f"/check-ins/{check_in.id}/photo", headers=auth_headers
  )
  assert delete_response.status_code == 409
  assert delete_response.json()["detail"] == MSG_PHOTO_NOT_TODAY

  assert fake_storage.objects == {}
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None


def test_other_user_gets_403_when_visible_and_404_when_hidden(
  client,
  other_auth_headers,
  habit_factory,
  check_in_factory,
  fake_storage,
):
  public_check_in = check_in_factory(habit_factory(is_public=True))
  private_check_in = check_in_factory(habit_factory(is_public=False))

  put_public = client.put(
    f"/check-ins/{public_check_in.id}/photo",
    headers=other_auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert put_public.status_code == 403
  assert put_public.json()["detail"] == MSG_CHECK_IN_FORBIDDEN

  delete_public = client.delete(
    f"/check-ins/{public_check_in.id}/photo", headers=other_auth_headers
  )
  assert delete_public.status_code == 403
  assert delete_public.json()["detail"] == MSG_CHECK_IN_FORBIDDEN

  put_private = client.put(
    f"/check-ins/{private_check_in.id}/photo",
    headers=other_auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert put_private.status_code == 404
  assert put_private.json()["detail"] == MSG_CHECK_IN_NOT_FOUND

  delete_private = client.delete(
    f"/check-ins/{private_check_in.id}/photo", headers=other_auth_headers
  )
  assert delete_private.status_code == 404
  assert delete_private.json()["detail"] == MSG_CHECK_IN_NOT_FOUND

  assert fake_storage.objects == {}


def test_invalid_uploads_return_415_413_and_400_without_modifying_check_in(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())

  unsupported = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(b"texto qualquer disfarcado de imagem"),
  )
  assert unsupported.status_code == 415
  assert unsupported.json()["detail"] == MSG_PHOTO_UNSUPPORTED

  too_large = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(b"x" * (6 * 1024 * 1024)),
  )
  assert too_large.status_code == 413
  assert too_large.json()["detail"] == MSG_PHOTO_TOO_LARGE

  truncated = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()[:80]),
  )
  assert truncated.status_code == 400
  assert truncated.json()["detail"] == MSG_PHOTO_INVALID

  assert fake_storage.objects == {}
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None
    assert session.get(CheckIn, check_in.id) is not None


def test_storage_failure_on_save_returns_503_and_leaves_nothing(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())
  fake_storage.fail_on_save = True

  response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )

  assert response.status_code == 503
  assert response.json()["detail"] == MSG_PHOTO_STORAGE_FAILED
  assert fake_storage.objects == {}
  with Session(test_engine) as session:
    assert get_photo(session, check_in.id) is None


def test_storage_failure_on_delete_during_replace_returns_200_with_orphans(
  client, auth_headers, test_engine, habit_factory, check_in_factory, fake_storage
):
  check_in = check_in_factory(habit_factory())

  first = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg()),
  )
  assert first.status_code == 200
  old_keys = set(fake_storage.objects)

  fake_storage.fail_on_delete = True
  second = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files=_upload_file(_jpeg((200, 200))),
  )
  assert second.status_code == 200

  with Session(test_engine) as session:
    photo = get_photo(session, check_in.id)

  assert photo is not None
  new_keys = {photo.full_key, photo.thumbnail_key}
  assert new_keys.isdisjoint(old_keys)
  assert set(fake_storage.objects) == old_keys | new_keys
