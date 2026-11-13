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

from app.auth.schemas import normalize_identifier
from app.checkins.schemas import GroupSummary
from app.group.models import GroupRole, RankingCriterion
from app.habits.schemas import HabitCreate, HabitPublic, HabitUpdate
from app.validators import NoNul

UsernameInput = Annotated[
  str,
  BeforeValidator(normalize_identifier),
  StringConstraints(min_length=1, max_length=30),
  NoNul,
]


def _normalize_invite_code(value: str) -> str:
  """Normaliza o código sem criar dependência circular entre módulos."""
  from app.group.invite import normalize_invite_code

  return normalize_invite_code(value)


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


class MemberAdd(BaseModel):
  """Dados para adicionar um membro ao grupo por username."""

  model_config = ConfigDict(from_attributes=True)

  username: UsernameInput


class JoinRequest(BaseModel):
  """Dados para entrar em um grupo utilizando um código de convite."""

  code: Annotated[str, BeforeValidator(_normalize_invite_code)]


class GroupPreview(BaseModel):
  """Resumo público de um grupo acessado por código de convite."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  members_count: int
  status: Literal["active", "ended"]


class InviteCodePublic(BaseModel):
  """Código de convite disponibilizado após sua geração ou renovação."""

  invite_code: str


class LeaveResult(BaseModel):
  """Resultado da saída de um membro do grupo."""

  model_config = ConfigDict(from_attributes=True)

  group_deleted: bool
  promoted_user_id: UUID | None = None


# Feed -------------------------------------------
MSG_FEED_ONE_DIRECTION = "Informe before ou after, não os dois."


class FeedQuery(BaseModel):
  """Paginação do feed por cursor.

  `before` traz os itens mais antigos que o cursor (rolar para baixo); `after`,
  os mais novos (polling). Os dois juntos são recusados.
  """

  limit: int = Field(default=20, ge=1, le=50)
  before: str | None = None
  after: str | None = None

  @model_validator(mode="after")
  def _one_direction(self) -> Self:
    if self.before is not None and self.after is not None:
      raise ValueError(MSG_FEED_ONE_DIRECTION)
    return self


class FeedAuthor(BaseModel):
  """Quem fez o check-in."""

  id: UUID
  username: str


class FeedHabit(BaseModel):
  """Hábito do grupo ligado ao check-in."""

  id: UUID
  name: str


class FeedItem(BaseModel):
  """Check-in no feed do grupo, só com os hábitos do grupo."""

  cursor: str
  id: UUID
  author: FeedAuthor
  title: str
  description: str | None
  habits: list[FeedHabit]
  created_at: datetime


class FeedPage(BaseModel):
  """Página do feed, do check-in mais novo ao mais antigo."""

  items: list[FeedItem]
  next_cursor: str | None
  has_more: bool
