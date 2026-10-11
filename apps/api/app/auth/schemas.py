from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserPublic(BaseModel):
  """representação pública do usuário, sem senha."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  username: str
  email: str


class TokenResponse(BaseModel):
  access_token: str
  refresh_token: str
  exp: int
