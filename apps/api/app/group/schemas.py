from datetime import date, datetime
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  ConfigDict,
  Field,
  StringConstraints,
  model_validator,
)

from app.checkins.schemas import GroupSummary
from app.group.models import GroupRole, RankingCriterion
from app.habits.schemas import HabitCreate, HabitPublic, HabitUpdate
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


class GroupUpdate(BaseModel):
  """Dados para atualização parcial de um grupo."""

  model_config = ConfigDict(from_attributes=True)

  name: GroupName | None = None
  description: GroupDescription = None
  ends_on: date | None = None
  ranking_criterion: RankingCriterion | None = None

  @model_validator(mode="after")
  def validate_explicit_nulls(self) -> Self:
    if "name" in self.model_fields_set and self.name is None:
      raise ValueError("O nome do grupo não pode ser nulo.")

    if "ranking_criterion" in self.model_fields_set and self.ranking_criterion is None:
      raise ValueError("O critério do ranking não pode ser nulo.")

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


_IS_PUBLIC_IGNORED = "Ignorado: hábito de grupo é sempre visível só aos membros."


class GroupHabitCreate(HabitCreate):
  """Corpo do `POST /groups/{group_id}/habits`. A meta é obrigatória."""

  is_public: bool = Field(default=False, exclude=True, description=_IS_PUBLIC_IGNORED)


class GroupHabitUpdate(HabitUpdate):
  """Corpo do `PATCH /groups/{group_id}/habits/{habit_id}`.

  Muda nome, descrição, categoria e `target_end_date`. `goal` no corpo é ignorado
  (campo extra), como no hábito pessoal. `is_public` é aceito mas ignorado.
  """

  is_public: bool | None = Field(
    default=None, exclude=True, description=_IS_PUBLIC_IGNORED
  )


class GroupHabitPublic(HabitPublic):
  """Hábito de grupo devolvido pelas rotas, com o resumo do grupo."""

  group: GroupSummary
