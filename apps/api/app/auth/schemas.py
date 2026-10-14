from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
