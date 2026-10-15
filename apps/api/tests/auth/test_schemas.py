# Testes funcionais de validação e serialização dos schemas

import pytest
from pydantic import ValidationError

from app.auth.schemas import TokenRefreshRequest, TokenResponse, UserPublic
from types import SimpleNamespace
from uuid import uuid4


# Teste 1: verifica se UserPublic não expõe o hash da senha
def test_user_public_does_not_expose_password_hash():
  user = SimpleNamespace(
    id=uuid4(),
    name="João",
    username="joaozin123",
    email="joaogameplay@gmail.com",
    password_hash="$2b$1343eFAf",
  )

  user_public = UserPublic.model_validate(user)

  assert not hasattr(user_public, "password_hash")


# Teste 2: verifica se TokenResponse aceita e armazena os campos esperados
def test_token_response_validate_fields():
  tokens_teste = TokenResponse(
    access_token="ACC001",
    refresh_token="RAC001",
    exp=4,
  )

  assert tokens_teste.access_token == "ACC001"
  assert tokens_teste.refresh_token == "RAC001"
  assert tokens_teste.exp == 4


# Teste 3: verifica se TokenRefreshRequest aceita um refresh token válido
def test_token_refresh_request_accepts_valid_refresh_token():
  refresh_token = "token-de-refresh-valido"

  request = TokenRefreshRequest(refresh_token=refresh_token)

  assert request.refresh_token == refresh_token


# Teste 4: verifica se TokenRefreshRequest rejeita uma string vazia
def test_token_refresh_request_rejects_empty_refresh_token():
  with pytest.raises(ValidationError):
    TokenRefreshRequest(refresh_token="")


# Teste 5: verifica se TokenRefreshRequest rejeita um campo obrigatório ausente
def test_token_refresh_request_rejects_missing_refresh_token():
  with pytest.raises(ValidationError):
    TokenRefreshRequest()
