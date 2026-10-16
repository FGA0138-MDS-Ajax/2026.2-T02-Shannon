from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

USERNAME_PATTERN = r"^[a-z0-9_.]+$"
PASSWORD_MAX_BYTES = 72


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

  refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
  """corpo do POST /auth/logout."""

  refresh_token: str = Field(min_length=1)


class SignupRequest(BaseModel):
  """corpo do POST /auth/signup. chega ao serviço já normalizado."""

  username: str = Field(min_length=3, max_length=30, pattern=USERNAME_PATTERN)
  email: EmailStr
  password: str = Field(min_length=8)
  name: str = Field(min_length=1, max_length=100)

  @field_validator("username", "email", mode="before")
  @classmethod
  def _normalize_identifier(cls, value: object) -> object:
    return normalize_identifier(value)

  @field_validator("name", mode="before")
  @classmethod
  def _strip_name(cls, value: object) -> object:
    if isinstance(value, str):
      return value.strip()
    return value

  @field_validator("password")
  @classmethod
  def _password_max_bytes(cls, value: str) -> str:
    # limite do bcrypt; a mensagem nunca inclui a senha
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
      raise ValueError(f"A senha deve ter no máximo {PASSWORD_MAX_BYTES} bytes.")
    return value


class SignupResponse(BaseModel):
  """resposta do POST /auth/signup."""

  user: UserPublic
  token: TokenResponse
