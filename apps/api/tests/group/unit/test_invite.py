from app.group.invite import (
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  generate_invite_code,
  normalize_invite_code,
)


def test_generate_invite_code_length_and_alphabet() -> None:
  code = generate_invite_code()

  assert len(code) == INVITE_CODE_LENGTH
  assert len(code) == 8
  assert all(char in INVITE_ALPHABET for char in code)


def test_generate_invite_code_excludes_ambiguous_characters() -> None:
  # Gera múltiplos códigos para garantir cobertura estatística dos caracteres
  codes = [generate_invite_code() for _ in range(100)]

  ambiguous_chars = {"I", "O", "0", "1"}
  for code in codes:
    assert not any(char in ambiguous_chars for char in code)


def test_normalize_invite_code_lowercase() -> None:
  assert normalize_invite_code("abcd2345") == "ABCD2345"


def test_normalize_invite_code_removes_spaces() -> None:
  assert normalize_invite_code("ABCD 2345") == "ABCD2345"


def test_normalize_invite_code_removes_hyphens() -> None:
  assert normalize_invite_code("ABCD-2345") == "ABCD2345"


def test_normalize_invite_code_mixed_format() -> None:
  assert normalize_invite_code("AbCd- 2345") == "ABCD2345"


def test_normalize_invite_code_already_normalized() -> None:
  assert normalize_invite_code("ABCD2345") == "ABCD2345"
