from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Testes unitários de grupo não usam banco: substitui o `run_before` raiz."""
  yield
