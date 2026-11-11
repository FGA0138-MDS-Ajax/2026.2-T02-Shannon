from datetime import date, datetime
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  ConfigDict,
  StringConstraints,
  model_validator,
)

from app.group.models import GroupRole, RankingCriterion
from app.validators import NoNul


def _blank_to_none(value: object) -> object:
  """Converte strings vazias ou compostas apenas por espaços em None."""
  if isinstance(value, str) and not value.strip():
    return None
  return value


GroupName = Annotated[
  str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100), NoNul
]

GroupDescription = Annotated[
  Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None,
  BeforeValidator(_blank_to_none),
  NoNul,
]

MSG_ENDS_ON_BEFORE_STARTS_ON = (
  "A data de término deve ser igual ou posterior à data de início."
)


class GroupCreate(BaseModel):
  """Dados para criação de um novo grupo."""

  model_config = ConfigDict(from_attributes=True)

  name: GroupName
  description: GroupDescription = None
  starts_on: date | None = None
  ends_on: date | None = None
  ranking_criterion: RankingCriterion

  @model_validator(mode="after")
  def validate_period(self) -> Self:
    if (
      self.starts_on is not None
      and self.ends_on is not None
      and self.ends_on < self.starts_on
    ):
      raise ValueError(MSG_ENDS_ON_BEFORE_STARTS_ON)
    return self


class MemberPublic(BaseModel):
  """Dados públicos de um integrante do grupo."""

  model_config = ConfigDict(from_attributes=True)

  user_id: UUID
  username: str
  role: GroupRole
  joined_at: datetime


class GroupListItem(BaseModel):
  """Item resumido do grupo para listagem."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  members_count: int
  my_role: GroupRole
  status: Literal["active", "ended"]
  ends_on: date | None
  ranking_criterion: RankingCriterion


class GroupDetail(BaseModel):
  """Dados detalhados do grupo."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  description: str | None
  starts_on: date
  ends_on: date | None
  ranking_criterion: RankingCriterion
  status: Literal["active", "ended"]
  members_count: int
  my_role: GroupRole
  invite_code: str | None
  members: list[MemberPublic]
