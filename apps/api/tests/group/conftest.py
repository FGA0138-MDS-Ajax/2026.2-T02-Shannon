from collections.abc import Callable, Iterable
from contextlib import AbstractContextManager
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import Engine, event
from sqlmodel import Session

from app.auth.models import User
from app.checkins.models import CheckIn, CheckInHabit
from app.group.models import Group, GroupRole, Member
from app.habits.models import Habit
from tests.conftest import _auth_headers, _create_user
from tests.group.fixtures import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
  _sp,
)

AuthHeaders = dict[str, str]


class QueryCounter:
  """Registra as instruções SQL que o engine executa dentro do bloco `with`."""

  def __init__(self, engine: Engine) -> None:
    self.engine = engine
    self.statements: list[str] = []

  def _before_execute(self, connection, cursor, statement, *args) -> None:
    self.statements.append(statement)

  def __enter__(self) -> list[str]:
    event.listen(self.engine, "before_cursor_execute", self._before_execute)
    return self.statements

  def __exit__(self, exc_type, exc_value, traceback) -> None:
    event.remove(self.engine, "before_cursor_execute", self._before_execute)


@pytest.fixture
def group_factory(test_engine: Engine) -> Callable[..., Group]:
  """`group_factory(admin=None, **campos) -> Group`, direto no banco.

  Com `admin`, o usuário já entra como administrador. Campos: `name`,
  `starts_on`, `ends_on` e `ranking_criterion`.
  """

  def create(admin: User | None = None, **fields) -> Group:
    return _make_group(test_engine, admin=admin, **fields)

  return create


@pytest.fixture
def member_factory(test_engine: Engine) -> Callable[..., Member]:
  """`member_factory(group, user, role="member", joined_at=None) -> Member`."""

  def create(
    group: Group,
    user: User,
    role: GroupRole = GroupRole.MEMBER,
    joined_at: datetime | None = None,
  ) -> Member:
    return _add_member(test_engine, group, user, role=role, joined_at=joined_at)

  return create


@pytest.fixture
def group_habit_factory(test_engine: Engine) -> Callable[..., Habit]:
  """`group_habit_factory(group, **campos) -> Habit`, com meta diária por padrão.

  Aceita `with_goal=False`, `starts_on` (início da meta) e os campos do hábito.
  """

  def create(group: Group, **fields) -> Habit:
    return _make_group_habit(test_engine, group, **fields)

  return create


@pytest.fixture
def make_users(test_engine: Engine) -> Callable[..., list[tuple[User, AuthHeaders]]]:
  """`make_users(n, prefix="membro") -> [(usuário, cabeçalhos de autenticação)]`."""

  def create(n: int, prefix: str = "membro") -> list[tuple[User, AuthHeaders]]:
    users = [_create_user(test_engine, f"{prefix}{index}") for index in range(n)]
    return [(user, _auth_headers(user)) for user in users]

  return create


@pytest.fixture
def query_counter(test_engine: Engine) -> Callable[[], AbstractContextManager]:
  """`with query_counter() as queries:` -> lista com o SQL executado no bloco.

  Compare dois cenários de tamanhos diferentes; nunca com um número fixo.
  """
  return lambda: QueryCounter(test_engine)


def create_group_history(
  engine: Engine,
  habits: Iterable[Habit],
  users: Iterable[User],
  start: date,
  end: date,
) -> None:
  """Grava, num commit só, um check-in por dia, usuário e hábito (fim incluso).

  Cada check-in é ao meio-dia de São Paulo. Serve para a medição de desempenho,
  que precisa de milhares de linhas sem milhares de commits.
  """
  habits, users = list(habits), list(users)
  check_ins: list[CheckIn] = []
  links: list[CheckInHabit] = []
  for offset in range((end - start).days + 1):
    created_at = _sp(start + timedelta(days=offset))
    for user in users:
      for habit in habits:
        check_in = CheckIn(user_id=user.id, title="Histórico", created_at=created_at)
        check_ins.append(check_in)
        links.append(CheckInHabit(check_in_id=check_in.id, habit_id=habit.id))
  with Session(engine) as session:
    session.add_all(check_ins)
    session.flush()  # os check-ins precisam existir antes dos vínculos (FK)
    session.add_all(links)
    session.commit()


@pytest.fixture
def group_setup(
  group_factory: Callable[..., Group],
  member_factory: Callable[..., Member],
  make_users: Callable[..., list[tuple[User, AuthHeaders]]],
  user: User,
  other_user: User,
  freeze_today: Callable[[date], None],
) -> SimpleNamespace:
  """Grupo ativo com `user` admin, `other_user` membro e um usuário de fora."""
  freeze_today(TODAY)
  group = group_factory()
  member_factory(group, user, GroupRole.ADMIN)
  member_factory(group, other_user)
  _, outsider_headers = make_users(1, prefix="fora")[0]
  return SimpleNamespace(
    group=group,
    admin_headers=_auth_headers(user),
    member_headers=_auth_headers(other_user),
    outsider_headers=outsider_headers,
  )


@pytest.fixture
def ended_group(
  group_factory: Callable[..., Group],
  user: User,
  freeze_today: Callable[[date], None],
) -> Group:
  """Grupo encerrado em 01/11, com `user` admin."""
  freeze_today(TODAY)
  return group_factory(admin=user, ends_on=date(2026, 11, 1))
