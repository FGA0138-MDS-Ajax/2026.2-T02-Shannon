from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Testes unitários puros não usam banco: substitui o `run_before` da raiz."""
  yield
