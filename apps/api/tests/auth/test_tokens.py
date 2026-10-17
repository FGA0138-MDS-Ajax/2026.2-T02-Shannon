from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest

from app.auth.schemas import TokenResponse
from app.auth.tokens import (
  TokenExpiredError,
  TokenInvalidError,
  create_access_token,
  create_refresh_token,
  create_token_pair,
  decode_token,
)
from app.config import settings


# Teste 1: confirma que o token de acesso contém os claims esperados e que
# a expiração retornada pela função corresponde ao claim `exp`.
def test_create_access_token_contains_required_claims():
  user_id = "usuario-teste"

  token, exp = create_access_token(user_id)
  payload = decode_token(token, expected_type="access")

  assert payload["sub"] == user_id
  assert payload["type"] == "access"
  assert "jti" in payload
  assert "iat" in payload
  assert "exp" in payload
  assert isinstance(payload["exp"], int)
  assert exp == payload["exp"]


# Teste 2: confirma que o token de acesso expira em aproximadamente 15 minutos,
# considerando a diferença entre o horário atual e o claim `exp`.
def test_create_access_token_expires_in_about_15_minutes():
  token, exp = create_access_token("usuario-teste")

  now = int(datetime.now(UTC).timestamp())
  diferenca = exp - now

  assert 14 * 60 <= diferenca <= 15 * 60


# Teste 3: confirma que o token de atualização contém o usuário, o tipo,
# os identificadores de sessão e do token, e uma validade de aproximadamente
# sete dias.
def test_create_refresh_token_has_correct_type_and_expiration():
  session_id = str(uuid4())
  jti = str(uuid4())
  token = create_refresh_token("usuario-teste", session_id, jti)
  payload = decode_token(token, expected_type="refresh")

  now = int(datetime.now(UTC).timestamp())
  diferenca = payload["exp"] - now

  assert payload["sub"] == "usuario-teste"
  assert payload["type"] == "refresh"
  assert payload["sid"] == session_id
  assert payload["jti"] == jti
  assert isinstance(payload["exp"], int)
  assert 6 * 24 * 60 * 60 <= diferenca <= 7 * 24 * 60 * 60


# Teste 4: confirma que a criação do par retorna um TokenResponse com os dois
# tokens, que `exp` corresponde ao token de acesso e que o token de atualização
# contém os identificadores de sessão e JTI informados.
def test_create_token_pair_returns_valid_token_response():
  session_id = str(uuid4())
  refresh_jti = str(uuid4())
  response = create_token_pair("usuario-teste", session_id, refresh_jti)

  assert isinstance(response, TokenResponse)
  assert response.access_token
  assert response.refresh_token
  assert isinstance(response.exp, int)

  access_payload = decode_token(response.access_token, expected_type="access")

  assert response.exp == access_payload["exp"]
  refresh_payload = decode_token(response.refresh_token, expected_type="refresh")
  assert refresh_payload["sid"] == session_id
  assert refresh_payload["jti"] == refresh_jti


# Teste 5: confirma que criar dois pares para o mesmo usuário gera tokens
# diferentes e valores de JTI distintos para acesso e atualização.
def test_create_token_pair_generates_new_tokens_each_time():
  first = create_token_pair("usuario-teste", str(uuid4()), str(uuid4()))
  second = create_token_pair("usuario-teste", str(uuid4()), str(uuid4()))

  assert first.access_token != second.access_token
  assert first.refresh_token != second.refresh_token

  first_access = decode_token(first.access_token, "access")
  second_access = decode_token(second.access_token, "access")

  first_refresh = decode_token(first.refresh_token, "refresh")
  second_refresh = decode_token(second.refresh_token, "refresh")

  assert first_access["jti"] != second_access["jti"]
  assert first_refresh["jti"] != second_refresh["jti"]


# Teste 6: confirma que a decodificação levanta TokenExpiredError quando
# o token de acesso já está expirado.
def test_decode_token_raises_error_when_token_is_expired():
  token, _ = create_access_token("usuario-teste", expires_delta=timedelta(seconds=-1))

  with pytest.raises(TokenExpiredError):
    decode_token(token, expected_type="access")


# Teste 7: altera o payload de um token sem recalcular sua assinatura e confirma
# que a decodificação o rejeita como inválido.
def test_decode_token_rejects_tampered_payload():
  token, _ = create_access_token("usuario-teste")
  parts = token.split(".")

  first_char = parts[1][0]
  parts[1] = ("A" if first_char != "A" else "B") + parts[1][1:]
  tampered_token = ".".join(parts)

  with pytest.raises(TokenInvalidError):
    decode_token(tampered_token, expected_type="access")


# Teste 8: cria um token válido, mas assinado com outra chave, e confirma
# que a aplicação rejeita a assinatura.
def test_decode_token_rejects_token_signed_with_another_secret():
  now = int(datetime.now(UTC).timestamp())

  token = jwt.encode(
    {
      "sub": "usuario-teste",
      "type": "access",
      "jti": str(uuid4()),
      "iat": now,
      "exp": now + 60,
    },
    key="segredo-diferente-para-teste-com-tamanho-seguro",
    algorithm="HS256",
  )

  with pytest.raises(TokenInvalidError):
    decode_token(token, expected_type="access")


# Teste 9: confirma que uma string que não está no formato JWT é rejeitada.
def test_decode_token_rejects_random_string():
  with pytest.raises(TokenInvalidError):
    decode_token("isto-nao-e-um-jwt", expected_type="access")


# Teste 10: confirma que um token de atualização não pode ser usado como
# token de acesso.
def test_decode_token_rejects_refresh_token_as_access():
  token = create_refresh_token("usuario-teste", str(uuid4()), str(uuid4()))

  with pytest.raises(TokenInvalidError):
    decode_token(token, expected_type="access")


# Teste 11: confirma que um token de acesso não pode ser usado como
# token de atualização.
def test_decode_token_rejects_access_token_as_refresh():
  token, _ = create_access_token("usuario-teste")

  with pytest.raises(TokenInvalidError):
    decode_token(token, expected_type="refresh")


# Teste 12: cria um token assinado corretamente, mas sem o claim obrigatório
# `sub`, e confirma que a decodificação o rejeita.
def test_decode_token_rejects_token_without_sub():
  now = int(datetime.now(UTC).timestamp())

  token = jwt.encode(
    {
      "type": "access",
      "jti": str(uuid4()),
      "iat": now,
      "exp": now + 60,
    },
    key=settings.JWT_SECRET_KEY,
    algorithm="HS256",
  )

  with pytest.raises(TokenInvalidError):
    decode_token(token, expected_type="access")
