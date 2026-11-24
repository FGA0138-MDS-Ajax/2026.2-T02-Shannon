from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Substitui a fixture do conftest raiz para dispensar o banco."""
  yield
