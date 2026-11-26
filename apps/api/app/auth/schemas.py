from typing import Annotated, Self
from uuid import UUID

from pydantic import (
  AfterValidator,
  BaseModel,
  BeforeValidator,
  ConfigDict,
  EmailStr,
  Field,
  StringConstraints,
  field_validator,
  model_validator,
)

from app.validators import NoNul

USERNAME_PATTERN = r"^[a-z0-9_.]+$"
PASSWORD_MAX_BYTES = 72
MSG_PASSWORD_CONFIRMATION = "A confirmação não confere com a nova senha."
MSG_PASSWORD_UNCHANGED = "A nova senha deve ser diferente da atual."
MSG_UPDATE_NULL_FIELD = "Os campos name, username e email não aceitam null."
MSG_UPDATE_NO_FIELDS = "Informe ao menos um campo para alterar."
MSG_UPDATE_EMAIL_NEEDS_PASSWORD = "Informe a senha atual para alterar o e-mail."
UPDATABLE_FIELDS = ("name", "username", "email")


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


def _strip_text(value: object) -> object:
  """Remove espaços nas pontas. Valores que não são texto passam direto."""
  if isinstance(value, str):
    return value.strip()
  return value


# Campos da conta, usados no cadastro (AUTH-4) e na edição da conta (PERF-1).
# Os `BeforeValidator` do `Annotated` rodam de trás para a frente: primeiro a
# normalização (último da lista), depois o `NoNul`, por fim as restrições do
# `str`. Assim `"  Maria  "` é limpo antes de contar o tamanho.
AccountUsername = Annotated[
  str,
  StringConstraints(min_length=3, max_length=30, pattern=USERNAME_PATTERN),
  NoNul,
  BeforeValidator(normalize_identifier),
]
AccountEmail = Annotated[EmailStr, NoNul, BeforeValidator(normalize_identifier)]
AccountName = Annotated[
  str,
  StringConstraints(min_length=1, max_length=100),
  NoNul,
  BeforeValidator(_strip_text),
]


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

  username: AccountUsername
  email: AccountEmail
  password: PasswordInput
  name: AccountName


class UserUpdate(BaseModel):
  """corpo do PATCH /auth/session/me. Só os campos enviados são alterados.

  Campo omitido não muda; campo enviado como `null` é recusado. A senha atual
  só é exigida para trocar o e-mail, que serve de login, e não perde os espaços.
  """

  name: AccountName | None = None
  username: AccountUsername | None = None
  email: AccountEmail | None = None
  current_password: str | None = None

  @model_validator(mode="after")
  def _check_fields(self) -> Self:
    """Recusa `null`, corpo sem campos e e-mail sem a senha atual, nessa ordem."""
    sent = self.model_fields_set & set(UPDATABLE_FIELDS)
    if any(getattr(self, field) is None for field in sent):
      raise ValueError(MSG_UPDATE_NULL_FIELD)
    if not sent:
      raise ValueError(MSG_UPDATE_NO_FIELDS)
    if "email" in sent and self.current_password is None:
      raise ValueError(MSG_UPDATE_EMAIL_NEEDS_PASSWORD)
    return self


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
