# Testes para o endpoint POST /auth/refresh

from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import AuthSession
from app.auth.tokens import (
  create_access_token,
  create_refresh_token,
  decode_token,
)


# Monta os dados padrão de um cadastro válido para os testes.
def signup_payload(**overrides):
  payload = {
    "name": "Usuario Teste",
    "username": f"user_{uuid4().hex[:10]}",
    "email": f"{uuid4().hex[:10]}@example.com",
    "password": "SenhaSegura123",
  }
  payload.update(overrides)
  return payload


# teste 1: confirma que um refresh válido retorna novos tokens para o mesmo usuário.
def test_refresh_returns_new_token_pair(
  client: TestClient,
):
  payload = signup_payload()

  signup_response = client.post("/auth/signup", json=payload)
  assert signup_response.status_code == 201

  original = signup_response.json()
  old_refresh = original["token"]["refresh_token"]

  response = client.post(
    "/auth/refresh",
    json={"refresh_token": old_refresh},
  )

  assert response.status_code == 200

  new_tokens = response.json()
  assert set(new_tokens) == {
    "access_token",
    "refresh_token",
    "exp",
  }
  assert new_tokens["access_token"] != original["token"]["access_token"]
  assert new_tokens["refresh_token"] != old_refresh
  assert isinstance(new_tokens["exp"], int)

  me_response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
  )

  assert me_response.status_code == 200
  assert me_response.json()["id"] == original["user"]["id"]


# teste 2: confirma que a rotação atualiza o JTI armazenado na sessão.
def test_refresh_updates_session_jti(
  client: TestClient,
  test_engine,
):
  payload = signup_payload()

  signup_response = client.post("/auth/signup", json=payload)
  assert signup_response.status_code == 201

  original = signup_response.json()
  old_refresh = original["token"]["refresh_token"]

  response = client.post(
    "/auth/refresh",
    json={"refresh_token": old_refresh},
  )

  assert response.status_code == 200

  new_refresh = response.json()["refresh_token"]

  old_claims = decode_token(old_refresh, "refresh")
  new_claims = decode_token(new_refresh, "refresh")

  assert new_claims["sid"] == old_claims["sid"]
  assert new_claims["jti"] != old_claims["jti"]

  with Session(test_engine) as db:
    auth_session = db.get(
      AuthSession,
      UUID(new_claims["sid"]),
    )

  assert auth_session is not None
  assert str(auth_session.current_jti) == new_claims["jti"]
  assert auth_session.last_used_at is not None


# teste 3: confirma que reutilizar um refresh antigo encerra e invalida a sessão.
def test_reusing_old_refresh_invalidates_session(
  client: TestClient,
):
  payload = signup_payload()

  signup_response = client.post("/auth/signup", json=payload)
  assert signup_response.status_code == 201

  old_refresh = signup_response.json()["token"]["refresh_token"]

  first_refresh = client.post(
    "/auth/refresh",
    json={"refresh_token": old_refresh},
  )
  assert first_refresh.status_code == 200

  new_refresh = first_refresh.json()["refresh_token"]

  reused_response = client.post(
    "/auth/refresh",
    json={"refresh_token": old_refresh},
  )

  assert reused_response.status_code == 401
  assert reused_response.json()["detail"] == "Token inválido."

  # o refresh novo também deixa de funcionar após a detecção de reuso.
  new_refresh_response = client.post(
    "/auth/refresh",
    json={"refresh_token": new_refresh},
  )

  assert new_refresh_response.status_code == 401
  assert new_refresh_response.json()["detail"] == "Token inválido."


# teste 4: confirma que um refresh expirado é rejeitado com HTTP 401.
def test_refresh_rejects_expired_token(client: TestClient):
  expired_refresh = create_refresh_token(
    str(uuid4()),
    str(uuid4()),
    str(uuid4()),
    expires_delta=timedelta(seconds=-1),
  )

  response = client.post(
    "/auth/refresh",
    json={"refresh_token": expired_refresh},
  )

  assert response.status_code == 401
  assert response.json()["detail"] == "Token expirado."


# teste 5: confirma que um token de acesso não pode ser usado como refresh token.
def test_refresh_rejects_access_token(client: TestClient):
  access_token, _ = create_access_token(str(uuid4()))

  response = client.post(
    "/auth/refresh",
    json={"refresh_token": access_token},
  )

  assert response.status_code == 401
  assert response.json()["detail"] == "Token inválido."


# teste 6: confirma que tokens inválidos ou vazios são rejeitados.
@pytest.mark.parametrize(
  "token",
  [
    "token-aleatorio-invalido",
    "",
  ],
)
def test_refresh_rejects_invalid_token(
  client: TestClient,
  token: str,
):
  response = client.post(
    "/auth/refresh",
    json={"refresh_token": token},
  )

  assert response.status_code in {401, 422}


# teste 7: confirma que a ausência do campo refresh_token retorna HTTP 422.
def test_refresh_rejects_missing_token(client: TestClient):
  response = client.post("/auth/refresh", json={})

  assert response.status_code == 422
