"""FOTO-2: `FakeStorage` e `S3Storage`, sem Docker e sem rede."""

from datetime import UTC, datetime
from urllib.parse import parse_qs, urlsplit

import pytest
from botocore.exceptions import ClientError
from botocore.stub import Stubber

from app.config import Settings
from app.storage.base import StorageError
from app.storage.fake import FakeStorage
from app.storage.s3 import S3Storage, build_s3_client

BUCKET = "habbit-photos-dev"


def _s3() -> tuple[S3Storage, Stubber]:
  settings = Settings(
    DATABASE_URL="postgresql://x:x@localhost/x",
    JWT_SECRET_KEY="x" * 32,
    storage_backend="r2",
    r2_endpoint_url="https://conta-falsa.r2.cloudflarestorage.com",
    r2_access_key_id="chave-falsa",
    r2_secret_access_key="segredo-falso",
    r2_bucket_name=BUCKET,
  )
  client = build_s3_client(settings)
  return S3Storage(client, BUCKET, url_expires_in=1800), Stubber(client)


# 1. FakeStorage


def test_fake_storage_save_read_delete_and_list() -> None:
  storage = FakeStorage()
  storage.save("a/1.jpg", b"um", "image/jpeg")
  storage.save("a/2.jpg", b"dois", "image/jpeg")
  storage.save("b/3.jpg", b"tres", "image/jpeg")
  storage.save("a/1.jpg", b"novo", "image/jpeg")  # sobrescreve

  assert storage.objects == {"a/1.jpg": b"novo", "a/2.jpg": b"dois", "b/3.jpg": b"tres"}
  assert [o.key for o in storage.list_objects("a/")] == ["a/1.jpg", "a/2.jpg"]

  storage.delete([])
  storage.delete(["a/1.jpg", "nao-existe.jpg"])  # inexistente não é erro
  assert set(storage.objects) == {"a/2.jpg", "b/3.jpg"}

  when = datetime(2026, 1, 1, tzinfo=UTC)
  storage.set_last_modified("b/3.jpg", when)
  assert next(storage.list_objects("b/")).last_modified == when

  assert storage.presigned_url("a/2.jpg") == (
    "https://fake-storage.local/a/2.jpg?expires=1800"
  )
  storage.clear()
  assert storage.objects == {}


def test_fake_storage_failure_flags() -> None:
  storage = FakeStorage()
  storage.fail_on_save = True
  with pytest.raises(StorageError):
    storage.save("k", b"x", "image/jpeg")
  storage.fail_on_delete = True
  with pytest.raises(StorageError):
    storage.delete(["k"])


# 2. URL assinada, sem rede


def test_s3_presigned_url_has_bucket_key_expiry_and_signature() -> None:
  storage, _ = _s3()

  url = urlsplit(storage.presigned_url("checkins/abc/full.jpg"))
  query = parse_qs(url.query)

  assert BUCKET in url.geturl()
  assert url.path.endswith("checkins/abc/full.jpg")
  assert query["X-Amz-Expires"] == ["1800"]
  assert "X-Amz-Signature" in query


# 3. delete em lotes de até 1000 chaves


def test_s3_delete_splits_2500_keys_into_three_calls() -> None:
  storage, stubber = _s3()
  keys = [f"k/{i}.jpg" for i in range(2500)]
  for start in (0, 1000, 2000):  # o Stubber confere os parâmetros de cada chamada
    batch = keys[start : start + 1000]
    stubber.add_response(
      "delete_objects",
      {},
      {
        "Bucket": BUCKET,
        "Delete": {"Objects": [{"Key": key} for key in batch], "Quiet": True},
      },
    )
  with stubber:
    storage.delete(keys)
    stubber.assert_no_pending_responses()


def test_s3_delete_raises_when_response_has_errors() -> None:
  storage, stubber = _s3()
  stubber.add_response(
    "delete_objects",
    {"Errors": [{"Key": "k", "Code": "AccessDenied", "Message": "negado"}]},
  )
  with stubber, pytest.raises(StorageError):
    storage.delete(["k"])


# 4. ClientError vira StorageError


def test_s3_client_error_on_put_becomes_storage_error() -> None:
  storage, stubber = _s3()
  stubber.add_client_error("put_object", service_error_code="AccessDenied")

  with stubber, pytest.raises(StorageError) as raised:
    storage.save("k", b"x", "image/jpeg")

  assert isinstance(raised.value.__cause__, ClientError)
