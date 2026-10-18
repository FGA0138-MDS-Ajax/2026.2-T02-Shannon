from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.auth.models import User
from app.auth.session.models import AuthSession
from app.auth.tokens import decode_token


# Monta os dados padrão de um cadastro válido.
def signup_payload(**overrides):

  payload = {
    "name": "João da Silva",
    "username": f"joao_{uuid4().hex[:10]}",
    "email": f"{uuid4().hex[:10]}@example.com",
    "password": "SenhaSegura123",
  }
  payload.update(overrides)
  return payload


# Busca um usuário no banco de testes.
def get_user_by_username(engine, username):

  with Session(engine) as db:
    return db.exec(select(User).where(User.username == username)).first()


# Cadastro válido: retorna HTTP 201 e a resposta contém user e token.
def test_signup_returns_201_and_expected_fields(client: TestClient):

  payload = signup_payload()

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  body = response.json()

  assert set(body) == {"user", "token"}
  assert set(body["user"]) == {"id", "name", "username", "email"}
  assert set(body["token"]) == {
    "access_token",
    "refresh_token",
    "exp",
  }

  assert body["user"]["name"] == payload["name"]
  assert body["user"]["username"] == payload["username"]
  assert body["user"]["email"] == payload["email"]

  assert body["token"]["access_token"]
  assert body["token"]["refresh_token"]
  assert isinstance(body["token"]["exp"], int)


# Dados normalizados: username, e-mail e nome retornam sem espaços indevidos
# e com a capitalização esperada.
def test_signup_normalizes_username_email_and_name(client: TestClient):

  payload = signup_payload(
    name="  João da Silva  ",
    username=f"  JOAO_{uuid4().hex[:8]}  ",
    email=f"  {uuid4().hex[:8].upper()}@EXAMPLE.COM  ",
  )

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  user = response.json()["user"]

  assert user["name"] == "João da Silva"
  assert user["username"] == payload["username"].strip().lower()
  assert user["email"] == payload["email"].strip().lower()


# Senha segura: o hash armazenado é diferente da senha original.
def test_signup_stores_password_as_hash(
  client: TestClient,
  test_engine,
):

  payload = signup_payload()

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  user = get_user_by_username(
    test_engine,
    payload["username"],
  )

  assert user is not None
  assert user.password_hash != payload["password"]


# Resposta pública: não expõe password nem password_hash.
def test_signup_does_not_return_password_or_hash(client: TestClient):

  payload = signup_payload()

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  body = response.json()
  user_data = body["user"]

  assert "password" not in user_data
  assert "password_hash" not in user_data
  assert payload["password"] not in response.text


# Sessão criada: o cadastro cria uma sessão vinculada ao usuário.
def test_signup_creates_one_auth_session(
  client: TestClient,
  test_engine,
):

  payload = signup_payload()

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  user_id = UUID(response.json()["user"]["id"])

  with Session(test_engine) as db:
    sessions = db.exec(select(AuthSession).where(AuthSession.user_id == user_id)).all()

  assert len(sessions) == 1


# Tokens associados: os claims correspondem ao usuário e à sessão criados.
def test_signup_tokens_match_created_user_and_session(
  client: TestClient,
  test_engine,
):

  payload = signup_payload()

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201

  body = response.json()
  user_id = UUID(body["user"]["id"])

  access_payload = decode_token(
    body["token"]["access_token"],
    "access",
  )
  refresh_payload = decode_token(
    body["token"]["refresh_token"],
    "refresh",
  )

  assert access_payload["sub"] == str(user_id)

  session_id = UUID(refresh_payload["sid"])
  refresh_jti = UUID(refresh_payload["jti"])

  with Session(test_engine) as db:
    auth_session = db.get(AuthSession, session_id)

  assert auth_session is not None
  assert auth_session.user_id == user_id
  assert auth_session.current_jti == refresh_jti


# Username duplicado: retorna HTTP 409 e a mensagem correta.
def test_signup_rejects_duplicate_username(client: TestClient):

  payload = signup_payload()

  first_response = client.post("/auth/signup", json=payload)
  assert first_response.status_code == 201

  second_payload = signup_payload(
    username=payload["username"],
  )

  response = client.post("/auth/signup", json=second_payload)

  assert response.status_code == 409
  assert response.json()["detail"] == "Username já cadastrado."


# E-mail duplicado: retorna HTTP 409 e a mensagem correta.
def test_signup_rejects_duplicate_email(client: TestClient):

  payload = signup_payload()

  first_response = client.post("/auth/signup", json=payload)
  assert first_response.status_code == 201

  second_payload = signup_payload(
    email=payload["email"],
  )

  response = client.post("/auth/signup", json=second_payload)

  assert response.status_code == 409
  assert response.json()["detail"] == "E-mail já cadastrado."


# Campos inválidos: entradas que violam as regras de cadastro retornam HTTP 422.
@pytest.mark.parametrize(
  "overrides",
  [
    {"name": "   "},
    {"username": "ab"},
    {"username": "usuario com espaço"},
    {"username": "USUARIO!"},
    {"email": "email-invalido"},
    {"password": "1234567"},
    {"password": "a" * 73},
  ],
)
def test_signup_rejects_invalid_data(
  client: TestClient,
  overrides: dict,
):

  payload = signup_payload(**overrides)

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 422


# Campos inválidos: a ausência de um campo obrigatório retorna HTTP 422.
@pytest.mark.parametrize(
  "field",
  ["name", "username", "email", "password"],
)
def test_signup_rejects_missing_required_fields(
  client: TestClient,
  field: str,
):

  payload = signup_payload()
  del payload[field]

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 422


# Limite válido: uma senha com exatamente oito caracteres é aceita.
def test_signup_accepts_password_with_eight_characters(
  client: TestClient,
):

  payload = signup_payload(password="12345678")

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 201


# Username duplicado: a verificação de duplicidade ignora maiúsculas e minúsculas.
def test_signup_rejects_duplicate_username_ignoring_case(
  client: TestClient,
):

  username = f"joao_{uuid4().hex[:8]}"

  first_response = client.post(
    "/auth/signup",
    json=signup_payload(username=username),
  )
  assert first_response.status_code == 201

  response = client.post(
    "/auth/signup",
    json=signup_payload(username=username.upper()),
  )

  assert response.status_code == 409


# E-mail duplicado: a verificação de duplicidade ignora maiúsculas e minúsculas.
def test_signup_rejects_duplicate_email_ignoring_case(
  client: TestClient,
):

  email = f"{uuid4().hex[:8]}@example.com"

  first_response = client.post(
    "/auth/signup",
    json=signup_payload(email=email),
  )
  assert first_response.status_code == 201

  response = client.post(
    "/auth/signup",
    json=signup_payload(email=email.upper()),
  )

  assert response.status_code == 409


# Falha no cadastro: username duplicado não grava usuário ou sessão adicionais.
def test_signup_duplicate_username_does_not_create_extra_records(
  client: TestClient,
  test_engine,
):
  payload = signup_payload()

  first_response = client.post("/auth/signup", json=payload)
  assert first_response.status_code == 201

  with Session(test_engine) as db:
    users_before = len(db.exec(select(User)).all())
    sessions_before = len(db.exec(select(AuthSession)).all())

  duplicate_payload = signup_payload(
    username=payload["username"],
  )

  response = client.post(
    "/auth/signup",
    json=duplicate_payload,
  )

  assert response.status_code == 409

  with Session(test_engine) as db:
    users_after = len(db.exec(select(User)).all())
    sessions_after = len(db.exec(select(AuthSession)).all())

  assert users_after == users_before
  assert sessions_after == sessions_before


# Falha no cadastro: e-mail duplicado não grava usuário ou sessão adicionais.
def test_signup_duplicate_email_does_not_create_extra_records(
  client: TestClient,
  test_engine,
):
  payload = signup_payload()

  first_response = client.post("/auth/signup", json=payload)
  assert first_response.status_code == 201

  with Session(test_engine) as db:
    users_before = len(db.exec(select(User)).all())
    sessions_before = len(db.exec(select(AuthSession)).all())

  duplicate_payload = signup_payload(
    email=payload["email"],
  )

  response = client.post(
    "/auth/signup",
    json=duplicate_payload,
  )

  assert response.status_code == 409

  with Session(test_engine) as db:
    users_after = len(db.exec(select(User)).all())
    sessions_after = len(db.exec(select(AuthSession)).all())

  assert users_after == users_before
  assert sessions_after == sessions_before


@pytest.mark.parametrize(
  "overrides",
  [
    {"email": "email-invalido"},
    {"username": "ab"},
    {"password": "1234567"},
    {"name": "   "},
  ],
)
# Falha no cadastro: dados inválidos não gravam usuário ou sessão.
def test_signup_invalid_data_does_not_create_records(
  client: TestClient,
  test_engine,
  overrides: dict,
):
  payload = signup_payload(**overrides)

  with Session(test_engine) as db:
    users_before = len(db.exec(select(User)).all())
    sessions_before = len(db.exec(select(AuthSession)).all())

  response = client.post("/auth/signup", json=payload)

  assert response.status_code == 422

  with Session(test_engine) as db:
    users_after = len(db.exec(select(User)).all())
    sessions_after = len(db.exec(select(AuthSession)).all())

  assert users_after == users_before
  assert sessions_after == sessions_before
