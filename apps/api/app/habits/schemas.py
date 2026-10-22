from datetime import date
from typing import Annotated, Any
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  ConfigDict,
  StringConstraints,
  field_validator,
)

from app.habits.models import HabitCategory, HabitStatus


def _normalize_category(value: object) -> object:
  """Tira espaços e passa para minúsculas.

  A categoria é obrigatória: texto vazio, `None` e outros tipos seguem para o
  Enum, que os recusa.
  """
  if isinstance(value, str):
    return value.strip().lower()
  return value


def _blank_to_none(valor: Any) -> None | Any:
  valor = str(valor)
  if not valor.strip():
    return None
  return valor


CategoryInput = Annotated[HabitCategory, BeforeValidator(_normalize_category)]
HabitName = Annotated[
  str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)
]
HabitDescription = Annotated[
  str | None,
  StringConstraints(max_length=500, strip_whitespace=True),
  BeforeValidator(_blank_to_none),
]


class HabitPublic(BaseModel):
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
  model_config = ConfigDict(from_attributes=True)

  name: HabitName
  description: HabitDescription
  category: CategoryInput
  is_public: bool = False
  target_end_date: date | None

  @field_validator("target_end_date")
  @classmethod
  def validate_target_end_date(cls, valor: date | None) -> None:
    if valor is None:
      return None

    from app.habits.service import today

    if valor < today():
      raise ValueError
