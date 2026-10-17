# Testes para o endpoint POST /auth/logout

from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import AuthSession
from app.auth.tokens import decode_token


# cria um usuário e obtém os tokens iniciais para os testes de logout.
def signup_user(client: TestClient) -> dict:
  payload = {
    "name": "Usuario Teste",
    "username": f"user_{uuid4().hex[:10]}",
    "email": f"{uuid4().hex[:10]}@example.com",
    "password": "SenhaSegura123",
  }

  response = client.post("/auth/signup", json=payload)
  assert response.status_code == 201

  body = response.json()

  return {
    "user": body["user"],
    "access_token": body["token"]["access_token"],
    "refresh_token": body["token"]["refresh_token"],
  }


# busca uma sessão de autenticação no banco de testes pelo ID.
def get_session(test_engine, session_id: str):
  with Session(test_engine) as db:
    return db.get(AuthSession, UUID(session_id))


# teste 1: confirma que um logout válido apaga a sessão e retorna HTTP 204 sem corpo.
def test_logout_deletes_session_and_returns_204(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  claims = decode_token(user["refresh_token"], "refresh")
  session_id = claims["sid"]

  response = client.post(
    "/auth/logout",
    json={"refresh_token": user["refresh_token"]},
  )

  assert response.status_code == 204
  assert response.content == b""
  assert get_session(test_engine, session_id) is None


# teste 2: confirma que o refresh token deixa de funcionar após o encerramento
# da sessão.
def test_refresh_fails_after_logout(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  logout_response = client.post(
    "/auth/logout",
    json={"refresh_token": user["refresh_token"]},
  )
  assert logout_response.status_code == 204

  refresh_response = client.post(
    "/auth/refresh",
    json={"refresh_token": user["refresh_token"]},
  )

  assert refresh_response.status_code == 401
  assert refresh_response.json()["detail"] == "Token inválido."


# teste 3: confirma que repetir o logout com o mesmo refresh também retorna HTTP 204.
def test_logout_is_idempotent(client: TestClient):
  user = signup_user(client)

  first_response = client.post(
    "/auth/logout",
    json={"refresh_token": user["refresh_token"]},
  )
  second_response = client.post(
    "/auth/logout",
    json={"refresh_token": user["refresh_token"]},
  )

  assert first_response.status_code == 204
  assert second_response.status_code == 204
  assert second_response.content == b""


# teste 4: confirma que token inválido retorna HTTP 204 sem encerrar outra sessão.
def test_logout_with_invalid_token_returns_204_without_deleting_session(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  claims = decode_token(user["refresh_token"], "refresh")
  session_id = claims["sid"]

  response = client.post(
    "/auth/logout",
    json={"refresh_token": "token-invalido"},
  )

  assert response.status_code == 204
  assert get_session(test_engine, session_id) is not None


# teste 5: confirma que access token não encerra a sessão e retorna HTTP 204.
def test_logout_with_access_token_does_not_delete_session(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  claims = decode_token(user["refresh_token"], "refresh")
  session_id = claims["sid"]

  response = client.post(
    "/auth/logout",
    json={"refresh_token": user["access_token"]},
  )

  assert response.status_code == 204
  assert get_session(test_engine, session_id) is not None


# teste 6: confirma que encerrar uma sessão não afeta outras sessões do mesmo usuário.
def test_logout_only_ends_the_selected_session(
  client: TestClient,
  test_engine,
):
  user = signup_user(client)

  login_response = client.post(
    "/auth/login",
    json={
      "login": user["user"]["username"],
      "password": "SenhaSegura123",
    },
  )
  assert login_response.status_code == 200

  other_refresh = login_response.json()["refresh_token"]
  original_claims = decode_token(user["refresh_token"], "refresh")
  other_claims = decode_token(other_refresh, "refresh")

  assert original_claims["sid"] != other_claims["sid"]

  logout_response = client.post(
    "/auth/logout",
    json={"refresh_token": user["refresh_token"]},
  )

  assert logout_response.status_code == 204
  assert get_session(test_engine, original_claims["sid"]) is None
  assert get_session(test_engine, other_claims["sid"]) is not None

  other_refresh_response = client.post(
    "/auth/refresh",
    json={"refresh_token": other_refresh},
  )

  assert other_refresh_response.status_code == 200


# teste 7: confirma que campo refresh_token ausente ou vazio retorna HTTP 422.
def test_logout_rejects_missing_or_empty_refresh_token(
  client: TestClient,
):
  missing_response = client.post("/auth/logout", json={})
  empty_response = client.post(
    "/auth/logout",
    json={"refresh_token": ""},
  )

  assert missing_response.status_code == 422
  assert empty_response.status_code == 422
