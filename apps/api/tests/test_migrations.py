from collections.abc import Iterator
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, Engine, create_engine, inspect, text
from testcontainers.community.postgres import PostgresContainer


@pytest.fixture
def migration_engine(
  postgres_container: PostgresContainer,
) -> Iterator[Engine]:
  """Cria uma base vazia no container para os testes de migração."""
  raw_url = postgres_container.get_connection_url(driver=None)
  split = urlsplit(raw_url)
  base_url = urlunsplit(
    (
      split.scheme,
      split.netloc,
      split.path,
      split.query,
      split.fragment,
    )
  )

  db_name = f"test_migration_{uuid4().hex[:8]}"
  root_engine = create_engine(base_url, isolation_level="AUTOCOMMIT")
  with root_engine.connect() as conn:
    conn.execute(text(f"CREATE DATABASE {db_name}"))

  migration_url = urlunsplit(
    (
      split.scheme,
      split.netloc,
      f"/{db_name}",
      split.query,
      split.fragment,
    )
  )
  engine = create_engine(migration_url)

  try:
    yield engine
  finally:
    engine.dispose()
    with root_engine.connect() as conn:
      conn.execute(text(f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE)"))
    root_engine.dispose()


def alembic_config(connection: Connection) -> Config:
  """Monta a configuração do Alembic injetando a conexão ativa."""
  ini_path = Path(__file__).resolve().parents[1] / "alembic.ini"
  config = Config(str(ini_path))
  config.attributes["connection"] = connection
  return config


def test_upgrade_head_creates_schema(migration_engine: Engine) -> None:
  """upgrade head numa base vazia cria as 6 tabelas e o tipo habitstatus."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "head")
    connection.commit()

    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    expected_tables = {
      "users",
      "auth_sessions",
      "habits",
      "check_ins",
      "check_in_habits",
      "goals",
    }
    assert expected_tables.issubset(tables)

    enum_exists = connection.execute(
      text("SELECT 1 FROM pg_type WHERE typname = 'habitstatus'")
    ).scalar()
    assert enum_exists == 1


def test_models_match_migrations(migration_engine: Engine) -> None:
  """Depois do upgrade head, o check não acusa diferença entre modelos e migrações."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "head")
    connection.commit()

    command.check(cfg)


def test_downgrade_base_removes_everything(migration_engine: Engine) -> None:
  """downgrade base deixa a base sem as tabelas e sem o tipo habitstatus."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "head")
    connection.commit()

    command.downgrade(cfg, "base")
    connection.commit()

    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    app_tables = {
      "users",
      "auth_sessions",
      "habits",
      "check_ins",
      "check_in_habits",
      "goals",
    }
    assert not (tables & app_tables)

    enum_exists = connection.execute(
      text("SELECT 1 FROM pg_type WHERE typname = 'habitstatus'")
    ).scalar()
    assert enum_exists is None
