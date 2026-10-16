# Testes para o endpoint GET /session/me

from datetime import timedelta
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.auth.models import User
from app.auth.tokens import create_access_token, create_refresh_token


# fixture: cria um usuário no banco de dados para os testes.
@pytest.fixture
def user(test_engine):
  new_user = User(
    name="Usuário de Teste",
    username=f"usuario_{uuid4().hex[:8]}",
    email=f"{uuid4().hex[:8]}@teste.com",
    password_hash="hash_de_teste",
  )

  with Session(test_engine) as session:
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

  return new_user


# fixture: gera um token de acesso válido para o usuário de teste.
@pytest.fixture
def access_token(user):
  token, _ = create_access_token(str(user.id))
  return token


# teste 1: confirma que um token válido permite consultar os dados do próprio
# usuário.
def test_get_session_me_returns_authenticated_user(client, user, access_token):
  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {access_token}"},
  )

  assert response.status_code == 200

  data = response.json()

  assert data == {
    "id": str(user.id),
    "name": user.name,
    "username": user.username,
    "email": user.email,
  }


# teste 2: confirma que a resposta não expõe a senha nem seu hash.
def test_get_session_me_does_not_return_password_hash(client, access_token):
  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {access_token}"},
  )

  assert response.status_code == 200

  data = response.json()

  assert "password" not in data
  assert "password_hash" not in data


# teste 3: confirma que tokens de usuários diferentes retornam usuários
# distintos.
def test_get_session_me_returns_the_correct_user(client, test_engine):
  user_a = User(
    name="Usuário A",
    username=f"usuario_a_{uuid4().hex[:8]}",
    email=f"{uuid4().hex[:8]}@teste.com",
    password_hash="hash_a",
  )

  user_b = User(
    name="Usuário B",
    username=f"usuario_b_{uuid4().hex[:8]}",
    email=f"{uuid4().hex[:8]}@teste.com",
    password_hash="hash_b",
  )

  with Session(test_engine) as session:
    session.add(user_a)
    session.add(user_b)
    session.commit()
    session.refresh(user_a)
    session.refresh(user_b)

  token_a, _ = create_access_token(str(user_a.id))
  token_b, _ = create_access_token(str(user_b.id))

  response_a = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token_a}"},
  )
  response_b = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token_b}"},
  )

  assert response_a.status_code == 200
  assert response_b.status_code == 200

  assert response_a.json()["id"] == str(user_a.id)
  assert response_b.json()["id"] == str(user_b.id)


# teste 4: confirma que uma requisição sem credenciais é rejeitada com HTTP 401.
def test_get_session_me_without_authorization_returns_401(client):
  response = client.get("/session/me")

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Não autenticado."


# teste 5: confirma que um token enviado sem o esquema Bearer é rejeitado com
# HTTP 401.
def test_get_session_me_without_bearer_scheme_returns_401(client, access_token):
  response = client.get(
    "/session/me",
    headers={"Authorization": access_token},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Não autenticado."


# teste 6: confirma que um token expirado é rejeitado com HTTP 401.
def test_get_session_me_with_expired_token_returns_401(client, user):
  expired_token, _ = create_access_token(
    str(user.id),
    expires_delta=timedelta(seconds=-1),
  )

  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {expired_token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token expirado."


# teste 7: confirma que tokens inválidos ou malformados são rejeitados com HTTP 401.
@pytest.mark.parametrize(
  "token",
  [
    "token_inventado",
    "abc.def.ghi",
  ],
)
def test_get_session_me_with_invalid_token_returns_401(client, token):
  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token inválido."


# teste 8: confirma que um refresh token não pode ser usado como token de acesso.
def test_get_session_me_rejects_refresh_token(client, user):
  refresh_token = create_refresh_token(
    user_id=str(user.id), session_id=str(uuid4()), jti=str(uuid4())
  )

  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {refresh_token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token inválido."


# teste 9: confirma que um token válido cujo usuário não existe é rejeitado
# com HTTP 401.
def test_get_session_me_with_nonexistent_user_returns_401(client):
  nonexistent_user_id = uuid4()
  token, _ = create_access_token(str(nonexistent_user_id))

  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token inválido."
