from datetime import date
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  ConfigDict,
  StringConstraints,
  field_validator,
  model_validator,
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


MSG_HABIT_NAME_NULL = "O nome não pode ser nulo."
MSG_HABIT_CATEGORY_NULL = "A categoria não pode ser nula."
MSG_HABIT_IS_PUBLIC_NULL = "O campo is_public não pode ser nulo."

# campos que podem ficar de fora do PATCH, mas não podem vir como `null`
_HABIT_NOT_NULL_FIELDS = {
  "name": MSG_HABIT_NAME_NULL,
  "category": MSG_HABIT_CATEGORY_NULL,
  "is_public": MSG_HABIT_IS_PUBLIC_NULL,
}


class HabitUpdate(BaseModel):
  """Corpo do `PATCH /habits/{habit_id}`. Só os campos enviados mudam.

  `description` e `target_end_date` enviados como `null` são apagados.
  `status` e `finished_at` não entram aqui: mudam só pela rota de encerrar.
  """

  name: HabitName | None = None
  description: HabitDescription = None
  category: CategoryInput | None = None
  is_public: bool | None = None
  target_end_date: date | None = None

  @model_validator(mode="after")
  def reject_null_required(self) -> Self:
    """Recusa `name`, `category` e `is_public` enviados explicitamente como `null`."""
    for field, message in _HABIT_NOT_NULL_FIELDS.items():
      if field in self.model_fields_set and getattr(self, field) is None:
        raise ValueError(message)
    return self
