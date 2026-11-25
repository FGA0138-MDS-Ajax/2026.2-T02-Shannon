"""QA-1, cenários 5 a 7: trocar a senha derruba as outras sessões."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth.exceptions import MSG_WRONG_CURRENT_PASSWORD
from app.auth.session.models import AuthSession

URL = "/auth/session/me/password"
OLD = "senha-antiga-123"
NEW = "senha-nova-456"


@pytest.fixture
def conta(client: TestClient) -> dict:
  """Conta com duas sessões: A (do cadastro) e B (de um segundo login)."""
  suffix = uuid4().hex[:8]
  username = f"ana_{suffix}"
  signup = client.post(
    "/auth/signup",
    json={
      "name": "Ana",
      "username": username,
      "email": f"{username}@teste.com",
      "password": OLD,
    },
  )
  assert signup.status_code == 201
  second = client.post("/auth/login", json={"login": username, "password": OLD})
  assert second.status_code == 200
  return {
    "user_id": signup.json()["user"]["id"],
    "username": username,
    "a": signup.json()["token"],
    "b": second.json(),
  }


def _auth(token: dict) -> dict[str, str]:
  return {"Authorization": f"Bearer {token['access_token']}"}


def _body(**fields) -> dict:
  return {
    "current_password": OLD,
    "new_password": NEW,
    "new_password_confirmation": NEW,
    **fields,
  }


def _sessions(test_engine, user_id: str) -> int:
  with Session(test_engine) as db:
    return db.exec(
      select(func.count())
      .select_from(AuthSession)
      .where(AuthSession.user_id == user_id)
    ).one()


def test_troca_de_senha_derruba_outras_sessoes(client, test_engine, conta):
  assert _sessions(test_engine, conta["user_id"]) == 2

  response = client.put(URL, headers=_auth(conta["a"]), json=_body())

  assert response.status_code == 200
  novos = response.json()
  assert novos["access_token"] != conta["a"]["access_token"]
  assert novos["refresh_token"] != conta["a"]["refresh_token"]

  for antigo in (conta["a"], conta["b"]):
    refresh = client.post(
      "/auth/refresh", json={"refresh_token": antigo["refresh_token"]}
    )
    assert refresh.status_code == 401

  renovado = client.post(
    "/auth/refresh", json={"refresh_token": novos["refresh_token"]}
  )
  assert renovado.status_code == 200
  assert _sessions(test_engine, conta["user_id"]) == 1


@pytest.mark.parametrize(
  ("fields", "status_code"),
  [
    pytest.param(
      {"current_password": "senha-errada-999"}, 400, id="senha-atual-errada"
    ),
    pytest.param(
      {"new_password_confirmation": "outra-coisa-789"}, 422, id="confirmacao"
    ),
    pytest.param(
      {"new_password": OLD, "new_password_confirmation": OLD}, 422, id="igual"
    ),
    pytest.param(
      {"new_password": "1234567", "new_password_confirmation": "1234567"},
      422,
      id="curta",
    ),
  ],
)
def test_troca_recusada_nao_muda_nada(client, test_engine, conta, fields, status_code):
  response = client.put(URL, headers=_auth(conta["a"]), json=_body(**fields))

  assert response.status_code == status_code
  if status_code == 400:
    assert response.json()["detail"] == MSG_WRONG_CURRENT_PASSWORD
  # Nada mudou: as duas sessões seguem valendo e a senha antiga ainda entra.
  assert _sessions(test_engine, conta["user_id"]) == 2
  refresh = client.post(
    "/auth/refresh", json={"refresh_token": conta["b"]["refresh_token"]}
  )
  assert refresh.status_code == 200
  login = client.post("/auth/login", json={"login": conta["username"], "password": OLD})
  assert login.status_code == 200


def test_login_com_a_senha_antiga_falha_e_com_a_nova_funciona(client, conta):
  assert client.put(URL, headers=_auth(conta["a"]), json=_body()).status_code == 200

  antiga = client.post(
    "/auth/login", json={"login": conta["username"], "password": OLD}
  )
  nova = client.post("/auth/login", json={"login": conta["username"], "password": NEW})

  assert antiga.status_code == 401
  assert nova.status_code == 200
