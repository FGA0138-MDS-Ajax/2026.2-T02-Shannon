# Testes da rota PATCH /auth/session/me (editar conta).

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.auth.session.responses import RESPONSES_UPDATE_ACCOUNT

URL = "/auth/session/me"
PASSWORD = "senha-atual-123"


def _signup(client: TestClient, prefix: str) -> dict:
  """Cria a conta pela API e devolve o usuário, os tokens e o header."""
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
  return {
    **body,
    "headers": {"Authorization": f"Bearer {body['token']['access_token']}"},
  }


@pytest.fixture
def me(client: TestClient) -> dict:
  return _signup(client, "maria")


@pytest.fixture
def other(client: TestClient) -> dict:
  return _signup(client, "joao")


def _example(status_code: int, name: str) -> dict:
  """Exemplo de erro documentado no Swagger da rota."""
  content = RESPONSES_UPDATE_ACCOUNT[status_code]["content"]["application/json"]
  return content["examples"][name]["value"]


# Só o nome: 200 com o UserPublic atualizado, sem expor a senha.
def test_updates_name(client, me):
  response = client.patch(URL, headers=me["headers"], json={"name": "Maria S."})

  assert response.status_code == 200
  assert response.json() == {**me["user"], "name": "Maria S."}


# O GET /me já devolve os dados novos.
def test_get_me_reflects_update(client, me):
  client.patch(URL, headers=me["headers"], json={"username": "maria_nova"})

  response = client.get(URL, headers=me["headers"])

  assert response.json()["username"] == "maria_nova"


# O próprio username atual, até em maiúsculas: 200 e nada muda.
def test_own_username_is_not_conflict(client, me):
  username = me["user"]["username"].upper()

  response = client.patch(URL, headers=me["headers"], json={"username": username})

  assert response.status_code == 200
  assert response.json() == me["user"]


# Username de outra conta, também em maiúsculas: 409.
@pytest.mark.parametrize("transform", [str, str.upper])
def test_username_of_other_account_is_409(client, me, other, transform):
  username = transform(other["user"]["username"])

  response = client.patch(URL, headers=me["headers"], json={"username": username})

  assert response.status_code == 409
  assert response.json() == _example(409, "username_em_uso")


def test_email_of_other_account_is_409(client, me, other):
  body = {"email": other["user"]["email"], "current_password": PASSWORD}

  response = client.patch(URL, headers=me["headers"], json=body)

  assert response.status_code == 409
  assert response.json() == _example(409, "email_em_uso")


# Senha atual errada: 400 (não 401) e nada muda.
def test_wrong_password_is_400(client, me):
  body = {"email": "nova@teste.com", "current_password": "errada"}

  response = client.patch(URL, headers=me["headers"], json=body)

  assert response.status_code == 400
  assert response.json() == {"detail": "Senha atual incorreta."}
  assert client.get(URL, headers=me["headers"]).json() == me["user"]


# E-mail com a senha certa: 200, e o login passa a ser pelo e-mail novo.
def test_new_email_is_used_on_login(client, me):
  body = {"email": "Nova@Teste.com", "current_password": PASSWORD}

  response = client.patch(URL, headers=me["headers"], json=body)

  assert response.status_code == 200
  assert response.json()["email"] == "nova@teste.com"
  new_login = {"login": "nova@teste.com", "password": PASSWORD}
  old_login = {"login": me["user"]["email"], "password": PASSWORD}
  assert client.post("/auth/login", json=new_login).status_code == 200
  assert client.post("/auth/login", json=old_login).status_code == 401


# Os tokens antigos continuam valendo: o `sub` é o id, que não muda.
def test_tokens_keep_working(client, me):
  body = {
    "username": "maria_nova",
    "email": "nova@teste.com",
    "current_password": PASSWORD,
  }
  client.patch(URL, headers=me["headers"], json=body)

  assert client.get(URL, headers=me["headers"]).status_code == 200
  refresh = {"refresh_token": me["token"]["refresh_token"]}
  assert client.post("/auth/refresh", json=refresh).status_code == 200


# Erros do corpo: 422 igual ao exemplo documentado no Swagger.
@pytest.mark.parametrize(
  ("body", "example"),
  [
    ({}, "sem_campos"),
    ({"name": None}, "campo_null"),
    ({"email": "nova@teste.com"}, "email_sem_senha"),
    ({"username": "ab"}, "username_curto"),
    ({"username": "maria!"}, "username_invalido"),
  ],
)
def test_invalid_body_is_422(client, me, body, example):
  response = client.patch(URL, headers=me["headers"], json=body)

  assert response.status_code == 422
  expected = _example(422, example)["detail"][0]
  actual = response.json()["detail"][0]
  assert {key: actual[key] for key in ("loc", "msg", "type")} == expected


# Sem token ou com token inválido: 401, antes de olhar o corpo.
@pytest.mark.parametrize(
  ("headers", "detail"),
  [
    ({}, "Não autenticado."),
    ({"Authorization": "Bearer invalido"}, "Token inválido."),
  ],
)
def test_without_valid_token_is_401(client, headers, detail):
  response = client.patch(URL, headers=headers, json={"name": "Maria"})

  assert response.status_code == 401
  assert response.json() == {"detail": detail}


# O Swagger documenta todos os status da rota.
def test_openapi_lists_all_status_codes(client):
  operation = client.get("/openapi.json").json()["paths"][URL]["patch"]

  assert set(operation["responses"]) == {"200", "400", "401", "409", "422"}
  assert operation["summary"] == "Editar conta"
