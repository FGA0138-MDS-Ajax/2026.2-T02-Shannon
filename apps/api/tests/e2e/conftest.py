"""Base dos testes de ponta a ponta (E2E) da API.

Um teste E2E faz o que uma pessoa faria no app, em sequência, usando só dados
devolvidos pela própria API: o token vem do `/auth/signup`, o id do hábito vem
do `POST /habits`, e assim por diante. Nada de factory gravando no banco e nada
de token fabricado.

Comandos:
  uv run pytest -m e2e          # só os fluxos E2E
  uv run pytest -m "not e2e"    # a suíte rápida, sem os fluxos
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

E2E_DIR = "tests/e2e"


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
  """Põe o marcador `e2e` em todo teste desta pasta.

  Assim ninguém precisa lembrar de marcar cada arquivo, e `-m "not e2e"`
  nunca deixa um fluxo escapar para a suíte rápida.
  """
  for item in items:
    if E2E_DIR in item.path.as_posix():
      item.add_marker(pytest.mark.e2e)


@pytest.fixture
def api(client: TestClient) -> Iterator[TestClient]:
  """Cliente HTTP dos fluxos E2E.

  Aqui roda em processo, pelo `TestClient`, com o Postgres do testcontainers e
  o armazenamento em memória. A E2E-3 acrescenta o modo em que o mesmo cliente
  aponta para uma API publicada (`E2E_BASE_URL`).

  Cada função de teste é um fluxo: o `run_before` do `tests/conftest.py` apaga
  o banco depois dela, então um fluxo nunca enxerga os dados do outro.
  """
  yield client
