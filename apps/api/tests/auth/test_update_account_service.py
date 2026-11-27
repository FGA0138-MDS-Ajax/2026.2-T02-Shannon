# Testes do serviço update_account (PATCH /auth/session/me), com banco.

from collections.abc import Iterator
from uuid import uuid4

import pytest
from sqlalchemy import Engine, event
from sqlmodel import Session

from app.auth import repository as auth_repository
from app.auth import service
from app.auth.exceptions import (
  EmailTakenError,
  UsernameTakenError,
  WrongCurrentPasswordError,
)
from app.auth.models import User
from app.auth.schemas import UserUpdate
from app.auth.security import hash_password

PASSWORD = "senha-atual-123"


def _new_user(db: Session, prefix: str) -> User:
  suffix = uuid4().hex[:8]
  user = User(
    name=f"Usuário {prefix}",
    username=f"{prefix}_{suffix}",
    email=f"{prefix}_{suffix}@teste.com",
    password_hash=hash_password(PASSWORD),
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


@pytest.fixture
def db(test_engine: Engine) -> Iterator[Session]:
  with Session(test_engine) as session:
    yield session


@pytest.fixture
def me(db: Session) -> User:
  return _new_user(db, "maria")


@pytest.fixture
def other(db: Session) -> User:
  return _new_user(db, "joao")


def _reload(test_engine: Engine, user_id) -> User:
  """Lê o usuário numa sessão nova, para ver o que de fato foi gravado."""
  with Session(test_engine) as session:
    return session.get(User, user_id)


# Só o nome é alterado; username e e-mail continuam iguais.
def test_updates_only_name(db, me, test_engine):
  old_username, old_email = me.username, me.email

  result = service.update_account(db, me, UserUpdate(name="Maria S."))

  saved = _reload(test_engine, me.id)
  assert result.name == saved.name == "Maria S."
  assert (saved.username, saved.email) == (old_username, old_email)


# Username novo e livre é gravado.
def test_updates_username(db, me, test_engine):
  service.update_account(db, me, UserUpdate(username="maria_nova"))

  assert _reload(test_engine, me.id).username == "maria_nova"


# E-mail novo com a senha certa é gravado.
def test_updates_email_with_right_password(db, me, test_engine):
  data = UserUpdate(email="nova@teste.com", current_password=PASSWORD)

  service.update_account(db, me, data)

  assert _reload(test_engine, me.id).email == "nova@teste.com"


# Senha errada: 400 no router; nada é gravado, nem os outros campos.
def test_wrong_password_changes_nothing(db, me, test_engine):
  data = UserUpdate(name="Outro", email="nova@teste.com", current_password="errada")

  with pytest.raises(WrongCurrentPasswordError):
    service.update_account(db, me, data)

  saved = _reload(test_engine, me.id)
  assert (saved.name, saved.email) == (me.name, me.email)


# A senha é exigida mesmo quando o e-mail enviado é o atual.
def test_wrong_password_with_same_email(db, me):
  data = UserUpdate(email=me.email, current_password="errada")

  with pytest.raises(WrongCurrentPasswordError):
    service.update_account(db, me, data)


# Senha acima de 72 bytes ou com NUL vira senha errada, não erro 500.
@pytest.mark.parametrize("password", ["a" * 100, "sen\x00ha"])
def test_invalid_password_is_wrong_password(db, me, password):
  data = UserUpdate(email="nova@teste.com", current_password=password)

  with pytest.raises(WrongCurrentPasswordError):
    service.update_account(db, me, data)


# Senha errada vem antes do 409: não revela que o e-mail é de outra conta.
def test_wrong_password_before_email_taken(db, me, other):
  data = UserUpdate(email=other.email, current_password="errada")

  with pytest.raises(WrongCurrentPasswordError):
    service.update_account(db, me, data)


def test_rejects_username_of_other_account(db, me, other):
  with pytest.raises(UsernameTakenError):
    service.update_account(db, me, UserUpdate(username=other.username))


# Em maiúsculas o username é normalizado e continua sendo o da outra conta.
def test_rejects_username_of_other_account_ignoring_case(db, me, other):
  with pytest.raises(UsernameTakenError):
    service.update_account(db, me, UserUpdate(username=other.username.upper()))


def test_rejects_email_of_other_account(db, me, other):
  data = UserUpdate(email=other.email, current_password=PASSWORD)

  with pytest.raises(EmailTakenError):
    service.update_account(db, me, data)


# Username e e-mail juntos: se um falha, nenhum é gravado.
def test_conflict_changes_nothing(db, me, other, test_engine):
  data = UserUpdate(username="livre_123", email=other.email, current_password=PASSWORD)

  with pytest.raises(EmailTakenError):
    service.update_account(db, me, data)

  assert _reload(test_engine, me.id).username == me.username


# O username antigo fica livre para outra conta.
def test_old_username_becomes_free(db, me, other):
  old_username = me.username
  service.update_account(db, me, UserUpdate(username="maria_nova"))

  service.update_account(db, other, UserUpdate(username=old_username))

  assert other.username == old_username


# Valores iguais aos atuais não consultam nem gravam nada.
def test_same_values_do_not_query_or_write(db, me, test_engine):
  data = UserUpdate(
    name=me.name, username=me.username, email=me.email, current_password=PASSWORD
  )
  statements = []

  def record(conn, cursor, statement, *args):
    statements.append(statement)

  event.listen(test_engine, "before_cursor_execute", record)
  try:
    result = service.update_account(db, me, data)
  finally:
    event.remove(test_engine, "before_cursor_execute", record)

  assert result is me
  assert statements == []


# Corrida: outra conta grava o username entre a checagem e o commit. A
# checagem prévia não vê o conflito, o UNIQUE do banco recusa e o serviço
# responde o erro certo, desfazendo a alteração.
def test_race_on_username_becomes_username_taken(
  db, me, other, monkeypatch, test_engine
):
  real_lookup = auth_repository.get_user_by_username
  calls = []

  def lookup_missing_first(session, username):
    calls.append(username)
    return None if len(calls) == 1 else real_lookup(session, username)

  monkeypatch.setattr(auth_repository, "get_user_by_username", lookup_missing_first)

  with pytest.raises(UsernameTakenError):
    service.update_account(db, me, UserUpdate(username=other.username))

  assert len(calls) == 2
  assert _reload(test_engine, me.id).username == me.username


def test_race_on_email_becomes_email_taken(db, me, other, monkeypatch, test_engine):
  real_lookup = auth_repository.get_user_by_email
  calls = []

  def lookup_missing_first(session, email):
    calls.append(email)
    return None if len(calls) == 1 else real_lookup(session, email)

  monkeypatch.setattr(auth_repository, "get_user_by_email", lookup_missing_first)
  data = UserUpdate(email=other.email, current_password=PASSWORD)

  with pytest.raises(EmailTakenError):
    service.update_account(db, me, data)

  assert len(calls) == 2
  assert _reload(test_engine, me.id).email == me.email
