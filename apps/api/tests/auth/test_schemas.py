# testes para validação e serialização de UserPublic e TokenResponse

from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.auth.schemas import TokenRefreshRequest, TokenResponse, UserPublic


# teste 1: verifica se o Pydantic consegue transformar um objeto
# comum do Python em uma instância de UserPublic.
def test_user_public_validates_from_attributes():
  user = SimpleNamespace(
    id=uuid4(), name="João", username="joaozin123", email="joaogameplay@gmail.com"
  )

  user_public = UserPublic.model_validate(user)

  assert user_public.id == user.id
  assert user_public.name == user.name
  assert user_public.username == user.username
  assert user_public.email == user.email


# teste 2: teste para o user do banco de dados não passe o
# password_hash para o UserPublic
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


# teste 3: verifica se o TokenResponse valida os campos
def test_token_response_validate_fields():
  tokens_teste = TokenResponse(access_token="ACC001", refresh_token="RAC001", exp=4)

  assert tokens_teste.access_token == "ACC001"
  assert tokens_teste.refresh_token == "RAC001"
  assert tokens_teste.exp == 4


# teste 4: token válido: confirma que a classe aceita uma string não
# vazia e armazena seu valor corretamente.
def test_token_refresh_request_accepts_valid_refresh_token():
  refresh_token = "token-de-refresh-valido"

  request = TokenRefreshRequest(refresh_token=refresh_token)

  assert request.refresh_token == refresh_token


# teste 5: string vazia: verifica se o Pydantic rejeita "", pois o campo exige
# pelo menos um caractere.
def test_token_refresh_request_rejects_empty_refresh_token():
  with pytest.raises(ValidationError):
    TokenRefreshRequest(refresh_token="")


# teste 6: campo ausente: verifica se a classe rejeita a criação do objeto
# sem o campo obrigatório refresh_token.
def test_token_refresh_request_rejects_missing_refresh_token():
  with pytest.raises(ValidationError):
    TokenRefreshRequest()
