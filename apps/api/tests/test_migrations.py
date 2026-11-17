from collections.abc import Iterator
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, Engine, create_engine, inspect, text
from sqlalchemy.exc import IntegrityError
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
  """upgrade head numa base vazia cria as 8 tabelas e o tipo habitstatus."""
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
      "groups",
      "group_members",
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
      "groups",
      "group_members",
    }
    assert not (tables & app_tables)

    enum_exists = connection.execute(
      text("SELECT 1 FROM pg_type WHERE typname = 'habitstatus'")
    ).scalar()
    assert enum_exists is None


def test_group_migration_roundtrip_with_existing_habit(
  migration_engine: Engine,
) -> None:
  """upgrade e downgrade da migração de grupos funcionam com hábitos já salvos."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "0ceac8027fbf")
    connection.commit()

    user_id = uuid4()
    habit_id = uuid4()
    connection.execute(
      text(
        "INSERT INTO users (id, name, username, email, password_hash) "
        "VALUES (:id, 'Usuário Legado', 'legacy_user', 'legacy@habbit.app', 'hash')"
      ),
      {"id": user_id},
    )
    connection.execute(
      text(
        "INSERT INTO habits "
        "(id, name, category, is_public, status, author_user_id, created_at) "
        "VALUES "
        "(:id, 'Hábito Legado', 'outros', false, 'ACTIVE', :author_id, '2026-11-01')"
      ),
      {"id": habit_id, "author_id": user_id},
    )
    connection.commit()

    command.upgrade(cfg, "head")
    connection.commit()

    row = connection.execute(
      text("SELECT author_user_id, author_group_id FROM habits WHERE id = :id"),
      {"id": habit_id},
    ).one()
    assert row == (user_id, None)

    command.downgrade(cfg, "-1")
    connection.commit()

    inspector = inspect(connection)
    habit_columns = {col["name"] for col in inspector.get_columns("habits")}
    assert "author_group_id" not in habit_columns

    command.upgrade(cfg, "head")
    connection.commit()


def test_ck_habits_single_author_enforced_by_migration(
  migration_engine: Engine,
) -> None:
  """CHECK ck_habits_single_author exige exatamente um autor (usuário ou grupo)."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "head")
    connection.commit()

  user_id = uuid4()
  group_id = uuid4()
  with migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO users (id, name, username, email, password_hash) "
        "VALUES (:id, 'Autor', 'autor_user', 'autor@habbit.app', 'hash')"
      ),
      {"id": user_id},
    )
    conn.execute(
      text(
        "INSERT INTO groups (id, name, starts_on, ranking_criterion, invite_code) "
        "VALUES (:id, 'Grupo Teste', '2026-11-01', 'check_ins', 'CODE1234')"
      ),
      {"id": group_id},
    )

  with pytest.raises(IntegrityError), migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO habits (id, name, category, is_public, status, created_at) "
        "VALUES (:id, 'Sem autor', 'outros', false, 'ACTIVE', '2026-11-01')"
      ),
      {"id": uuid4()},
    )

  with pytest.raises(IntegrityError), migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO habits "
        "(id, name, category, is_public, status, "
        "author_user_id, author_group_id, created_at) "
        "VALUES "
        "(:id, 'Dois autores', 'outros', false, 'ACTIVE', "
        ":user_id, :group_id, '2026-11-01')"
      ),
      {"id": uuid4(), "user_id": user_id, "group_id": group_id},
    )

  with migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO habits "
        "(id, name, category, is_public, status, author_user_id, created_at) "
        "VALUES (:id, 'Pessoal', 'outros', false, 'ACTIVE', :user_id, '2026-11-01')"
      ),
      {"id": uuid4(), "user_id": user_id},
    )
    conn.execute(
      text(
        "INSERT INTO habits "
        "(id, name, category, is_public, status, author_group_id, created_at) "
        "VALUES (:id, 'De grupo', 'outros', false, 'ACTIVE', :group_id, '2026-11-01')"
      ),
      {"id": uuid4(), "group_id": group_id},
    )


def test_ck_groups_period_enforced_by_migration(migration_engine: Engine) -> None:
  """CHECK ck_groups_period recusa ends_on < starts_on e aceita ends_on nulo."""
  with migration_engine.connect() as connection:
    cfg = alembic_config(connection)
    command.upgrade(cfg, "head")
    connection.commit()

  with pytest.raises(IntegrityError), migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO groups "
        "(id, name, starts_on, ends_on, ranking_criterion, invite_code) "
        "VALUES (:id, 'Inválido', '2026-11-10', '2026-11-09', 'check_ins', 'INV11111')"
      ),
      {"id": uuid4()},
    )

  with migration_engine.begin() as conn:
    conn.execute(
      text(
        "INSERT INTO groups "
        "(id, name, starts_on, ends_on, ranking_criterion, invite_code) "
        "VALUES (:id, 'Mesmo dia', '2026-11-10', '2026-11-10', 'check_ins', 'EQ111111')"
      ),
      {"id": uuid4()},
    )
    conn.execute(
      text(
        "INSERT INTO groups "
        "(id, name, starts_on, ends_on, ranking_criterion, invite_code) "
        "VALUES (:id, 'Depois', '2026-11-10', '2026-11-20', 'goals', 'GT111111')"
      ),
      {"id": uuid4()},
    )
    conn.execute(
      text(
        "INSERT INTO groups "
        "(id, name, starts_on, ends_on, ranking_criterion, invite_code) "
        "VALUES (:id, 'Sem fim', '2026-11-10', NULL, 'check_ins', 'NUL11111')"
      ),
      {"id": uuid4()},
    )
