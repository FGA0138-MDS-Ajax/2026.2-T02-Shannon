from datetime import timedelta
from uuid import uuid4

import pytest
from sqlmodel import Session

from app.auth.models import User
from app.auth.tokens import create_access_token, create_refresh_token


@pytest.fixture
def user(test_engine):
  """Cria um usuário para os testes."""
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


@pytest.fixture
def access_token(user):
  """Gera um token de acesso válido para o usuário."""
  token, _ = create_access_token(str(user.id))
  return token


def test_get_session_me_returns_authenticated_user(client, user, access_token):
  """Um token válido permite consultar os dados do próprio usuário."""
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


def test_get_session_me_does_not_return_password_hash(client, access_token):
  """A resposta não deve expor a senha nem seu hash."""
  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {access_token}"},
  )

  assert response.status_code == 200

  data = response.json()

  assert "password" not in data
  assert "password_hash" not in data


def test_get_session_me_returns_the_correct_user(client, test_engine):
  """Tokens de usuários diferentes retornam usuários diferentes."""
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


def test_get_session_me_without_authorization_returns_401(client):
  """Uma requisição sem credenciais deve ser rejeitada."""
  response = client.get("/session/me")

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Não autenticado."


def test_get_session_me_without_bearer_scheme_returns_401(client, access_token):
  """Um token enviado sem o esquema Bearer deve ser rejeitado."""
  response = client.get(
    "/session/me",
    headers={"Authorization": access_token},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Não autenticado."


def test_get_session_me_with_expired_token_returns_401(client, user):
  """Um token expirado deve ser rejeitado."""
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


@pytest.mark.parametrize(
  "token",
  [
    "token_inventado",
    "abc.def.ghi",
  ],
)
def test_get_session_me_with_invalid_token_returns_401(client, token):
  """Tokens inválidos ou malformados devem ser rejeitados."""
  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token inválido."


def test_get_session_me_rejects_refresh_token(client, user):
  """Um refresh token não pode ser usado como token de acesso."""
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


def test_get_session_me_with_nonexistent_user_returns_401(client):
  """Um token válido cujo usuário não existe deve ser rejeitado."""
  nonexistent_user_id = uuid4()
  token, _ = create_access_token(str(nonexistent_user_id))

  response = client.get(
    "/session/me",
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 401
  assert response.headers.get("WWW-Authenticate") == "Bearer"
  assert response.json()["detail"] == "Token inválido."
