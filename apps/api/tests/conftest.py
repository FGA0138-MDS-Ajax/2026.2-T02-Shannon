from __future__ import annotations

from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import pytest
from sqlmodel import SQLModel
from testcontainers.postgres import PostgresContainer

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
    
    yield