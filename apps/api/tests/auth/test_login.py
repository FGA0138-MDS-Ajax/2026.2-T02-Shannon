# Testes para o endpoint POST /auth/login

from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.auth.models import AuthSession
from app.auth.tokens import decode_token


# cria um usuário e retorna seus dados para os testes de login.
def signup_user(client: TestClient) -> dict:
  payload = {
    "name": "Usuario Teste",
    "username": f"user_{uuid4().hex[:10]}",
    "email": f"{uuid4().hex[:10]}@example.com",
    "password": "SenhaSegura123",
  }

  response = client.post("/auth/signup", json=payload)
  assert response.status_code == 201

  return {
    **payload,
    "user": response.json()["user"],
  }


# retorna todas as sessões registradas de um determinado usuário.
def get_sessions_for_user(test_engine, user_id: str) -> list[AuthSession]:
  with Session(test_engine) as db:
    return db.exec(
      select(AuthSession).where(AuthSession.user_id == UUID(user_id))
    ).all()


# teste 1: confirma que login e senha válidos (por username ou e-mail) retornam
# HTTP 200 e par de tokens.
@pytest.mark.parametrize("login_field", ["username", "email"])
def test_login_with_username_or_email(
  client: TestClient,
  login_field: str,
):
  user = signup_user(client)

  response = client.post(
    "/auth/login",
    json={
      "login": user[login_field],
      "password": user["password"],
    },
  )

  assert response.status_code == 200
  assert set(response.json()) == {
    "access_token",
    "refresh_token",
    "exp",
  }
  assert response.json()["access_token"]
  assert response.json()["refresh_token"]
  assert isinstance(response.json()["exp"], int)


# teste 2: confirma que o login ignora espaços externos e variações de caixa.
@pytest.mark.parametrize("login_field", ["username", "email"])
def test_login_normalizes_login_value(
  client: TestClient,
  login_field: str,
):
  user = signup_user(client)

  response = client.post(
    "/auth/login",
    json={
      "login": f"  {user[login_field].upper()}  ",
      "password": user["password"],
    },
  )

  assert response.status_code == 200


# teste 3: confirma que logins sucessivos do mesmo usuário criam sessões distintas.
def test_login_creates_a_new_session_each_time(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  payload = {
    "login": user["username"],
    "password": user["password"],
  }

  first_response = client.post("/auth/login", json=payload)
  second_response = client.post("/auth/login", json=payload)

  assert first_response.status_code == 200
  assert second_response.status_code == 200

  first_refresh = first_response.json()["refresh_token"]
  second_refresh = second_response.json()["refresh_token"]

  first_claims = decode_token(first_refresh, "refresh")
  second_claims = decode_token(second_refresh, "refresh")

  assert first_claims["sid"] != second_claims["sid"]

  sessions = get_sessions_for_user(
    test_engine,
    user["user"]["id"],
  )

  assert len(sessions) == 3  # Uma do cadastro e duas dos logins.


# teste 4: confirma que senha incorreta retorna HTTP 401 e não cria sessão adicional.
def test_login_rejects_wrong_password_without_creating_session(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  sessions_before = get_sessions_for_user(
    test_engine,
    user["user"]["id"],
  )

  response = client.post(
    "/auth/login",
    json={
      "login": user["username"],
      "password": "senha-incorreta",
    },
  )

  assert response.status_code == 401
  assert response.json()["detail"] == "Usuário ou senha inválidos."

  sessions_after = get_sessions_for_user(
    test_engine,
    user["user"]["id"],
  )

  assert len(sessions_after) == len(sessions_before)


# teste 5: confirma que usuário inexistente e senha incorreta retornam o mesmo
# erro HTTP 401.
def test_login_returns_same_error_for_unknown_user(
  client: TestClient,
):
  response = client.post(
    "/auth/login",
    json={
      "login": "usuario_que_nao_existe",
      "password": "senha-qualquer",
    },
  )

  assert response.status_code == 401
  assert response.json()["detail"] == "Usuário ou senha inválidos."


# teste 6: confirma que senha curta é tratada como credencial inválida com
# HTTP 401.
def test_login_short_password_returns_401(
  client: TestClient,
):
  user = signup_user(client)

  response = client.post(
    "/auth/login",
    json={
      "login": user["username"],
      "password": "123",
    },
  )

  assert response.status_code == 401


# teste 7: confirma que campos obrigatórios ausentes ou vazios retornam HTTP 422.
@pytest.mark.parametrize(
  "payload",
  [
    {"password": "SenhaSegura123"},
    {"login": "usuario_teste"},
    {"login": "", "password": "SenhaSegura123"},
    {"login": "usuario_teste", "password": ""},
  ],
)
def test_login_rejects_missing_or_empty_fields(
  client: TestClient,
  payload: dict,
):
  response = client.post("/auth/login", json=payload)

  assert response.status_code == 422
