from collections.abc import Iterator

import pytest


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """O armazenamento não usa banco: substitui o `run_before` do conftest raiz."""
  yield
