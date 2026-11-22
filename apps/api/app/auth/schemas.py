from typing import Annotated, Self
from uuid import UUID

from pydantic import (
  AfterValidator,
  BaseModel,
  ConfigDict,
  EmailStr,
  Field,
  field_validator,
  model_validator,
)

from app.validators import NoNul

USERNAME_PATTERN = r"^[a-z0-9_.]+$"
PASSWORD_MAX_BYTES = 72
MSG_PASSWORD_CONFIRMATION = "A confirmação não confere com a nova senha."
MSG_PASSWORD_UNCHANGED = "A nova senha deve ser diferente da atual."


def _password_max_bytes(value: str) -> str:
  """Recusa senhas acima de 72 bytes."""
  # limite do bcrypt; a mensagem nunca inclui a senha
  if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
    raise ValueError(f"A senha deve ter no máximo {PASSWORD_MAX_BYTES} bytes.")
  return value


# Senha nova, no cadastro e na troca de senha: sem NUL, mínimo de 8 caracteres e
# máximo de 72 bytes. Os espaços não são removidos. O `Field` fica logo depois do
# `str`: depois de um validador, o Pydantic troca o erro `string_too_short` por um
# genérico.
PasswordInput = Annotated[
  str, Field(min_length=8), NoNul, AfterValidator(_password_max_bytes)
]


def normalize_identifier(value: object) -> object:
  """Remove espaços nas pontas e passa para minúsculas.

  Usada no username e no e-mail do cadastro e no campo `login` (AUTH-6).
  Valores que não são texto passam direto, para o Pydantic acusar o tipo errado.
  """
  if isinstance(value, str):
    return value.strip().lower()
  return value


class UserPublic(BaseModel):
  """representação pública do usuário, sem senha."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  username: str
  email: str


class TokenResponse(BaseModel):
  """par de tokens devolvido no cadastro, login e renovação."""

  access_token: str
  refresh_token: str
  exp: int


class TokenRefreshRequest(BaseModel):
  """corpo do POST /auth/refresh."""

  refresh_token: str = Field(min_length=1, max_length=2048)

  @field_validator("refresh_token", mode="before")
  @classmethod
  def _strip_token(cls, token: object) -> object:

    if isinstance(token, str):
      return token.strip()
    return token


class LoginRequest(BaseModel):
  """corpo do POST /auth/login. `login` aceita username ou e-mail."""

  login: Annotated[str, NoNul] = Field(min_length=1)
  password: Annotated[str, NoNul] = Field(min_length=1)

  @field_validator("login", mode="before")
  @classmethod
  def _normalize_login(cls, value: object) -> object:
    """Normaliza igual ao cadastro."""
    return normalize_identifier(value)


class LogoutRequest(BaseModel):
  """corpo do POST /auth/logout."""

  refresh_token: str = Field(min_length=1, max_length=2048)

  @field_validator("refresh_token", mode="before")
  @classmethod
  def _strip_token(cls, token: object) -> object:

    if isinstance(token, str):
      return token.strip()
    return token


class SignupRequest(BaseModel):
  """corpo do POST /auth/signup. chega ao serviço já normalizado."""

  username: str = Field(min_length=3, max_length=30, pattern=USERNAME_PATTERN)
  email: Annotated[EmailStr, NoNul]
  password: PasswordInput
  name: Annotated[str, NoNul] = Field(min_length=1, max_length=100)

  @field_validator("username", "email", mode="before")
  @classmethod
  def _normalize_identifier(cls, value: object) -> object:
    """Remove espaços nas pontas e passa para minúsculas."""
    return normalize_identifier(value)

  @field_validator("name", mode="before")
  @classmethod
  def _strip_name(cls, value: object) -> object:
    """Remove espaços nas pontas do nome."""
    if isinstance(value, str):
      return value.strip()
    return value


class SignupResponse(BaseModel):
  """resposta do POST /auth/signup."""

  user: UserPublic
  token: TokenResponse


class PasswordChange(BaseModel):
  """corpo do PUT /auth/session/me/password. As senhas não perdem os espaços."""

  current_password: Annotated[str, NoNul] = Field(min_length=1)
  new_password: PasswordInput
  new_password_confirmation: str

  @model_validator(mode="after")
  def _check_new_password(self) -> Self:
    """Confirmação igual à nova senha, e nova senha diferente da atual.

    Comparar o texto basta: o serviço confere a senha atual com o hash, então,
    se ela estiver certa, é a mesma que está gravada.
    """
    if self.new_password_confirmation != self.new_password:
      raise ValueError(MSG_PASSWORD_CONFIRMATION)
    if self.new_password == self.current_password:
      raise ValueError(MSG_PASSWORD_UNCHANGED)
    return self
