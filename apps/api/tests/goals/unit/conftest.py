from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Testes do motor não usam banco: substitui o `run_before` do conftest raiz."""
  yield
