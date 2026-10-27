from __future__ import annotations

from collections.abc import Callable, Iterator
from datetime import date, datetime, time, timedelta
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel
from testcontainers.community.postgres import PostgresContainer

from app.auth.models import User
from app.auth.tokens import create_access_token
from app.checkins.models import CheckIn, CheckInHabit
from app.database import get_session
from app.goals.models import Goal, GoalPeriod, ScheduleType
from app.habits import service as habits_service
from app.habits.models import Habit, HabitCategory, HabitStatus
from app.habits.service import APP_TIMEZONE, today
from app.main import app
from tests.support.db import db_connection


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[PostgresContainer]:
  """Start one disposable PostgreSQL container for integration tests."""
  with PostgresContainer("postgres:17") as container:
    yield container


@pytest.fixture(scope="session")
def connection_url(postgres_container: PostgresContainer) -> str:
  raw_url = postgres_container.get_connection_url(driver=None)
  split = urlsplit(raw_url)
  return urlunsplit(
    (
      split.scheme,
      split.netloc,
      split.path,
      split.query,
      split.fragment,
    )
  )


@pytest.fixture(autouse=True)
def run_before(connection_url: str) -> Iterator[None]:
  engine = db_connection(connection_url)

  SQLModel.metadata.create_all(engine)

  try:
    yield
  finally:
    tables = ", ".join(
      engine.dialect.identifier_preparer.format_table(table)
      for table in SQLModel.metadata.sorted_tables
    )
    if tables:
      with engine.begin() as connection:
        connection.exec_driver_sql(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE")
    engine.dispose()


@pytest.fixture
def test_engine(connection_url: str):
  """Cria um engine conectado ao banco de dados de teste."""
  engine = db_connection(connection_url)
  yield engine
  engine.dispose()


@pytest.fixture
def client(test_engine) -> Iterator[TestClient]:
  """Cria um cliente HTTP que utiliza o banco de teste."""

  def override_get_session():
    with Session(test_engine) as session:
      yield session

  app.dependency_overrides[get_session] = override_get_session

  test_client = TestClient(app)
  yield test_client

  app.dependency_overrides.clear()


def _save(engine: Engine, obj):
  """Grava o objeto num commit próprio e devolve com os campos do banco."""
  with Session(engine) as session:
    session.add(obj)
    session.commit()
    session.refresh(obj)
  return obj


def _create_user(engine: Engine, prefix: str) -> User:
  suffix = uuid4().hex[:8]
  return _save(
    engine,
    User(
      name=f"Usuário {prefix}",
      username=f"{prefix}_{suffix}",
      email=f"{prefix}_{suffix}@teste.com",
      password_hash="hash_de_teste",
    ),
  )


def _auth_headers(user: User) -> dict[str, str]:
  token, _ = create_access_token(str(user.id))
  return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user(test_engine: Engine) -> User:
  """Usuário gravado no banco. Use junto com `auth_headers` nas requisições."""
  return _create_user(test_engine, "usuario")


@pytest.fixture
def auth_headers(user: User) -> dict[str, str]:
  """Header `Authorization: Bearer ...` do `user`.

  Exemplo: `client.get("/habits", headers=auth_headers)`.
  """
  return _auth_headers(user)


@pytest.fixture
def other_user(test_engine: Engine) -> User:
  """Segundo usuário, para testar acesso a hábitos de outra pessoa."""
  return _create_user(test_engine, "outro")


@pytest.fixture
def other_auth_headers(other_user: User) -> dict[str, str]:
  """Header `Authorization: Bearer ...` do `other_user`."""
  return _auth_headers(other_user)


HabitFactory = Callable[..., Habit]
CheckInFactory = Callable[..., CheckIn]
GoalFactory = Callable[..., Goal]


def at_noon(day: date) -> datetime:
  """Meio-dia em São Paulo no dia dado, para o `created_at` dos check-ins.

  Meio-dia evita qualquer dúvida de fuso. Exemplo:
    check_in_factory(habit, created_at=at_noon(date(2026, 10, 20)))
  """
  return datetime.combine(day, time(12, 0), tzinfo=APP_TIMEZONE)


@pytest.fixture
def habit_factory(test_engine: Engine, user: User) -> HabitFactory:
  """Fábrica que grava hábitos direto no banco, sem passar pelo `POST /habits`.

  Por padrão cria um hábito ativo e privado do `user`. Exemplos:
    habit_factory()                              # privado, do `user`
    habit_factory(author=other_user, is_public=True)
    habit_factory(finished=True)                 # status finished + finished_at
    habit_factory(name="Correr", target_end_date=date(2026, 12, 31))
  """

  def create(
    *,
    author: User | None = None,
    is_public: bool = False,
    finished: bool = False,
    finished_at: date | None = None,
    **fields,
  ) -> Habit:
    if finished:
      fields["status"] = HabitStatus.FINISHED
      fields["finished_at"] = finished_at or today()
    fields.setdefault("name", "Hábito de teste")
    fields.setdefault("category", HabitCategory.OUTROS)
    fields.setdefault("created_at", today())
    return _save(
      test_engine,
      Habit(
        author_user_id=(author or user).id,
        is_public=is_public,
        **fields,
      ),
    )

  return create


@pytest.fixture
def check_in_factory(test_engine: Engine) -> CheckInFactory:
  """Fábrica que grava check-ins e seus vínculos direto no banco.

  Aceita um hábito ou uma lista. Por padrão o check-in é do autor do primeiro
  hábito. Exemplos:
    check_in_factory(habit)
    check_in_factory([habit_a, habit_b], title="Treino de perna")
    check_in_factory(habit, user=other_user, duration=timedelta(minutes=30))
    check_in_factory(habit, created_at=at_noon(date(2026, 10, 20)))  # no passado

  Sem `created_at`, o banco usa `now()`.
  """

  def create(
    habits: Habit | list[Habit],
    *,
    user: User | None = None,
    title: str = "Check-in de teste",
    description: str | None = None,
    duration: timedelta | None = None,
    created_at: datetime | None = None,
  ) -> CheckIn:
    habits = habits if isinstance(habits, list) else [habits]
    if not habits:
      raise ValueError("check_in_factory precisa de pelo menos um hábito.")
    user_id = user.id if user is not None else habits[0].author_user_id
    check_in = CheckIn(
      user_id=user_id,
      title=title,
      description=description,
      duration=duration,
      created_at=created_at,
    )
    with Session(test_engine) as session:
      session.add(check_in)
      session.flush()
      session.add_all(
        CheckInHabit(check_in_id=check_in.id, habit_id=habit.id) for habit in habits
      )
      session.commit()
      session.refresh(check_in)
    return check_in

  return create


@pytest.fixture
def goal_factory(test_engine: Engine) -> GoalFactory:
  """Fábrica que grava a meta de um hábito direto no banco.

  Por padrão cria uma meta diária com `starts_on` em 2000-01-01, para que
  check-ins no passado contem sem ajuste. Exemplos:
    goal_factory(habit)                                   # diária
    goal_factory(habit, period=GoalPeriod.WEEK, target_count=4, period_end_weekday=7)
    goal_factory(habit, period=GoalPeriod.MONTH, target_count=10,
                 starts_on=date(2026, 10, 1))
  """

  def create(
    habit: Habit,
    *,
    period: GoalPeriod = GoalPeriod.DAY,
    target_count: int = 1,
    period_end_weekday: int | None = None,
    starts_on: date = date(2000, 1, 1),
  ) -> Goal:
    return _save(
      test_engine,
      Goal(
        habit_id=habit.id,
        schedule_type=ScheduleType.FREQUENCY,
        period=period,
        target_count=target_count,
        period_end_weekday=period_end_weekday,
        starts_on=starts_on,
      ),
    )

  return create


@pytest.fixture
def freeze_today(monkeypatch: pytest.MonkeyPatch) -> Callable[[date], None]:
  """Fixa o "hoje" da API. Uso: `freeze_today(date(2026, 10, 28))`.

  Só afeta quem chama `habits_service.today()`. Não muda o `now()` do banco:
  um `POST /check-ins` continua gravando a data real.
  """

  def freeze(day: date) -> None:
    monkeypatch.setattr(habits_service, "today", lambda: day)

  return freeze
