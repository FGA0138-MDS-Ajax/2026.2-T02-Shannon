from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  ConfigDict,
  StringConstraints,
  field_validator,
)

from app.habits.models import HabitCategory, HabitStatus
from app.validators import NoNul


def _normalize_category(value: object) -> object:
  """Tira espaços e passa para minúsculas.

  A categoria é obrigatória: texto vazio, `None` e outros tipos seguem para o
  Enum, que os recusa.
  """
  if isinstance(value, str):
    return value.strip().lower()
  return value


def _blank_to_none(value: object) -> object:
  """Converte strings vazias ou compostas apenas por espaços em None."""
  if isinstance(value, str) and not value.strip():
    return None
  return value


CategoryInput = Annotated[HabitCategory, BeforeValidator(_normalize_category)]

HabitName = Annotated[
  str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100), NoNul
]

HabitDescription = Annotated[
  Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None,
  BeforeValidator(_blank_to_none),
  NoNul,
]


class HabitPublic(BaseModel):
  """Dados públicos do hábito devolvidos pelas rotas."""

  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  description: str | None
  category: HabitCategory
  is_public: bool
  status: HabitStatus
  author_user_id: UUID
  created_at: date
  target_end_date: date | None
  finished_at: date | None


class HabitCreate(BaseModel):
  """Dados para criação de um novo hábito."""

  model_config = ConfigDict(from_attributes=True)

  name: HabitName
  description: HabitDescription = None
  category: CategoryInput
  is_public: bool = False
  target_end_date: date | None = None

  @field_validator("target_end_date")
  @classmethod
  def validate_target_end_date(cls, valor: date | None) -> date | None:
    if valor is None:
      return None

    # Import dentro do validador para evitar import circular com service.py
    from app.habits.service import today

    if valor < today():
      raise ValueError(
        "A data alvo de término deve ser igual ou posterior à data de hoje."
      )

    return valor
