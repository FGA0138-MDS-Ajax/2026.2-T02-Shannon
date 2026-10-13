# testes para validação e serialização de UserPublic e TokenResponse

from types import SimpleNamespace
from uuid import uuid4
from app.auth.schemas import UserPublic, TokenResponse


# teste 1: verifica se o Pydantic consegue transformar um objeto comum do Python em uma instância de UserPublic.
def test_user_public_validates_from_attributes():
    user = SimpleNamespace(
        id=uuid4(), 
        name="João", 
        username="joaozin123", 
        email="joaogameplay@gmail.com" 
        )

    user_public = UserPublic.model_validate(user)

    assert user_public.id == user.id
    assert user_public.name == user.name
    assert user_public.username == user.username
    assert user_public.email == user.email


# teste 2: teste para o user do banco de dados não passe o password_hash para o UserPublic
def test_user_public_does_not_expose_password_hash():
    user = SimpleNamespace(
        id=uuid4(), 
        name="João", 
        username="joaozin123", 
        email="joaogameplay@gmail.com",
        password_hash="$2b$1343eFAf"
        )

    user_public = UserPublic.model_validate(user)

    assert hasattr(user_public, "password_hash") == False

# teste 3: verifica se o TokenResponse valida os campos
def test_token_response_validate_fields():
    tokens_teste = TokenResponse(access_token="ACC001", refresh_token="RAC001", exp=4)

    assert tokens_teste.access_token == "ACC001"
    assert tokens_teste.refresh_token == "RAC001"
    assert tokens_teste.exp == 4


# teste 4:
 
