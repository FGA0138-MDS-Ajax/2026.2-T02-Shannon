from __future__ import annotations

from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel
from testcontainers.community.postgres import PostgresContainer

from app.database import get_session
from app.main import app
from tests.support.db import db_connection


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[PostgresContainer]:
  """Start one disposable PostgreSQL container for integration tests."""
  with PostgresContainer("postgres:16") as container:
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
