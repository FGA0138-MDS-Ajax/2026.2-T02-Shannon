# Testes do schema UserUpdate (corpo do PATCH /auth/session/me), sem banco.

import pytest
from pydantic import ValidationError

from app.auth.schemas import (
  MSG_UPDATE_EMAIL_NEEDS_PASSWORD,
  MSG_UPDATE_NO_FIELDS,
  MSG_UPDATE_NULL_FIELD,
  UserUpdate,
)


def _error_messages(exc: pytest.ExceptionInfo[ValidationError]) -> list[str]:
  return [error["msg"] for error in exc.value.errors()]


# Só os campos enviados ficam em `model_fields_set`; os outros não serão alterados.
def test_only_sent_fields_are_set():
  data = UserUpdate(name="Maria S.")

  assert data.model_fields_set == {"name"}
  assert data.model_dump(exclude_unset=True) == {"name": "Maria S."}


# Username e e-mail são normalizados como no cadastro; o nome perde os espaços.
def test_normalizes_like_signup():
  data = UserUpdate(
    name="  Maria  ",
    username="  MARIA_SILVA ",
    email=" Maria@Teste.COM ",
    current_password="senha-atual",
  )

  assert data.name == "Maria"
  assert data.username == "maria_silva"
  assert data.email == "maria@teste.com"


# A senha atual não perde os espaços nem tem regra de tamanho.
@pytest.mark.parametrize("password", ["  com espaços  ", "", "a"])
def test_current_password_is_kept_as_sent(password):
  data = UserUpdate(email="maria@teste.com", current_password=password)

  assert data.current_password == password


# Corpo vazio, ou só com a senha atual, não tem o que alterar.
@pytest.mark.parametrize("body", [{}, {"current_password": "senha-atual"}])
def test_rejects_body_without_fields(body):
  with pytest.raises(ValidationError) as exc:
    UserUpdate(**body)

  assert _error_messages(exc) == [f"Value error, {MSG_UPDATE_NO_FIELDS}"]


# Campo enviado como null é recusado, mesmo junto com outro campo válido.
@pytest.mark.parametrize(
  "body",
  [
    {"name": None},
    {"username": None},
    {"email": None, "current_password": "senha-atual"},
    {"name": "Maria", "username": None},
  ],
)
def test_rejects_null_fields(body):
  with pytest.raises(ValidationError) as exc:
    UserUpdate(**body)

  assert _error_messages(exc) == [f"Value error, {MSG_UPDATE_NULL_FIELD}"]


# Trocar o e-mail exige a senha atual; `null` conta como não enviada.
@pytest.mark.parametrize(
  "body",
  [
    {"email": "maria@teste.com"},
    {"email": "maria@teste.com", "current_password": None},
  ],
)
def test_rejects_email_without_current_password(body):
  with pytest.raises(ValidationError) as exc:
    UserUpdate(**body)

  assert _error_messages(exc) == [f"Value error, {MSG_UPDATE_EMAIL_NEEDS_PASSWORD}"]


# Nome e username não exigem a senha atual.
def test_name_and_username_do_not_require_password():
  data = UserUpdate(name="Maria", username="maria")

  assert data.current_password is None


# Valores que violam as regras do cadastro são recusados.
@pytest.mark.parametrize(
  "body",
  [
    {"name": "   "},
    {"name": "a" * 101},
    {"name": "Ma\x00ria"},
    {"username": "ab"},
    {"username": "a" * 31},
    {"username": "usuario com espaço"},
    {"username": "usuario!"},
    {"email": "email-invalido", "current_password": "senha-atual"},
  ],
)
def test_rejects_values_invalid_on_signup(body):
  with pytest.raises(ValidationError):
    UserUpdate(**body)
