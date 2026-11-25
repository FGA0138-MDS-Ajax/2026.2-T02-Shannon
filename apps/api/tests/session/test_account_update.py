"""QA-1, cenários 1 a 4: editar a conta (`PATCH /auth/session/me`) de ponta a ponta."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth.exceptions import (
  MSG_EMAIL_TAKEN,
  MSG_USERNAME_TAKEN,
  MSG_WRONG_CURRENT_PASSWORD,
)

URL = "/auth/session/me"
PASSWORD = "senha-atual-123"


def _signup(client: TestClient, prefix: str) -> dict:
  """Cria a conta pela API e devolve o usuário e o cabeçalho de autenticação."""
  suffix = uuid4().hex[:8]
  response = client.post(
    "/auth/signup",
    json={
      "name": f"Usuário {prefix}",
      "username": f"{prefix}_{suffix}",
      "email": f"{prefix}_{suffix}@teste.com",
      "password": PASSWORD,
    },
  )
  assert response.status_code == 201
  body = response.json()
  token = body["token"]["access_token"]
  return {"user": body["user"], "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def maria(client: TestClient) -> dict:
  return _signup(client, "maria")


@pytest.fixture
def joao(client: TestClient) -> dict:
  return _signup(client, "joao")


# 1. Só os campos enviados mudam


def test_editar_so_o_nome_mantem_o_resto(client, maria):
  response = client.patch(URL, headers=maria["headers"], json={"name": "Maria S."})

  assert response.status_code == 200
  assert response.json() == {**maria["user"], "name": "Maria S."}


def test_editar_so_o_username_mantem_o_resto(client, maria):
  response = client.patch(
    URL, headers=maria["headers"], json={"username": "maria_nova"}
  )

  assert response.status_code == 200
  assert response.json() == {**maria["user"], "username": "maria_nova"}


def test_editar_nome_e_username_juntos(client, maria):
  body = {"name": "Maria Silva", "username": "maria_silva"}

  response = client.patch(URL, headers=maria["headers"], json=body)

  assert response.status_code == 200
  assert response.json() == {**maria["user"], **body}
  assert client.get(URL, headers=maria["headers"]).json() == response.json()


# 2. Conflitos com outra conta


def test_username_de_outra_conta_e_409_tambem_em_maiusculas(client, maria, joao):
  taken = joao["user"]["username"]

  for value in (taken, taken.upper()):
    response = client.patch(URL, headers=maria["headers"], json={"username": value})
    assert response.status_code == 409
    assert response.json()["detail"] == MSG_USERNAME_TAKEN


def test_email_de_outra_conta_e_409(client, maria, joao):
  response = client.patch(
    URL,
    headers=maria["headers"],
    json={"email": joao["user"]["email"], "current_password": PASSWORD},
  )

  assert response.status_code == 409
  assert response.json()["detail"] == MSG_EMAIL_TAKEN


# 3. E-mail exige a senha atual


def test_email_exige_a_senha_atual_e_vira_login(client, maria):
  new_email = f"novo_{uuid4().hex[:6]}@teste.com"

  sem_senha = client.patch(URL, headers=maria["headers"], json={"email": new_email})
  assert sem_senha.status_code == 422

  errada = client.patch(
    URL,
    headers=maria["headers"],
    json={"email": new_email, "current_password": "senha-errada-999"},
  )
  assert errada.status_code == 400
  assert errada.json()["detail"] == MSG_WRONG_CURRENT_PASSWORD

  certa = client.patch(
    URL,
    headers=maria["headers"],
    json={"email": new_email, "current_password": PASSWORD},
  )
  assert certa.status_code == 200
  assert certa.json()["email"] == new_email

  login = client.post("/auth/login", json={"login": new_email, "password": PASSWORD})
  assert login.status_code == 200


# 4. Corpos inválidos


@pytest.mark.parametrize(
  "body",
  [
    pytest.param({}, id="corpo-vazio"),
    pytest.param({"name": None}, id="nome-nulo"),
    pytest.param({"username": "ma@ria"}, id="username-com-arroba"),
  ],
)
def test_corpo_invalido_e_422(client, maria, body):
  response = client.patch(URL, headers=maria["headers"], json=body)

  assert response.status_code == 422
