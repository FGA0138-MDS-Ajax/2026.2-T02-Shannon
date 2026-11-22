import base64
import re
from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID

import pytest

from app.group.exceptions import InvalidCursorError
from app.group.feed import decode_cursor, encode_cursor

CHECK_IN_ID = UUID("f8b0c4de-7a2e-4b1c-9d3f-5e6a7b8c9d0e")
CREATED_AT = datetime(2026, 11, 12, 15, 30, 0, 123456, tzinfo=UTC)
VALID_CURSOR = encode_cursor(CREATED_AT, CHECK_IN_ID)


def _b64(text: str) -> str:
  return base64.urlsafe_b64encode(text.encode()).decode()


def test_cursor_round_trip() -> None:
  cursor = encode_cursor(CREATED_AT, CHECK_IN_ID)

  assert decode_cursor(cursor) == (CREATED_AT, CHECK_IN_ID)


def test_cursor_preserves_microseconds() -> None:
  created_at, _ = decode_cursor(encode_cursor(CREATED_AT, CHECK_IN_ID))

  assert created_at.microsecond == 123456


def test_cursor_round_trip_without_microseconds() -> None:
  # Sem microssegundos o base64 teria `=` no final, que o cursor não leva.
  created_at = CREATED_AT.replace(microsecond=0)
  cursor = encode_cursor(created_at, CHECK_IN_ID)

  assert decode_cursor(cursor) == (created_at, CHECK_IN_ID)


def test_cursor_preserves_timezone_offset() -> None:
  brasilia = timezone(timedelta(hours=-3))
  created_at = CREATED_AT.astimezone(brasilia)

  decoded, _ = decode_cursor(encode_cursor(created_at, CHECK_IN_ID))

  assert decoded == created_at
  assert decoded.utcoffset() == timedelta(hours=-3)


@pytest.mark.parametrize("microsecond", [0, 123456])
def test_cursor_is_url_safe(microsecond: int) -> None:
  cursor = encode_cursor(CREATED_AT.replace(microsecond=microsecond), CHECK_IN_ID)

  assert re.fullmatch(r"[A-Za-z0-9_-]+", cursor)


@pytest.mark.parametrize(
  "cursor",
  [
    "",
    "abc",
    "a",
    "!!!!",
    "ção",
    # Sem validação estrita, o base64 ignoraria os `!` e aceitaria o cursor.
    VALID_CURSOR[:8] + "!!!!" + VALID_CURSOR[8:],
    _b64("sem-separador"),
    _b64(f"data-ruim|{CHECK_IN_ID}"),
    _b64(f"{CREATED_AT.isoformat()}|nao-e-uuid"),
    _b64(f"{CREATED_AT.isoformat()}|{CHECK_IN_ID}|extra"),
    base64.urlsafe_b64encode(b"\xff\xfe|\x00").decode(),
  ],
)
def test_malformed_cursor_raises_invalid_cursor_error(cursor: str) -> None:
  with pytest.raises(InvalidCursorError):
    decode_cursor(cursor)
