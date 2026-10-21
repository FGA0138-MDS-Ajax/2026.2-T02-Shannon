from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict

from app.habits.models import HabitCategory, HabitStatus


def _normalize_category(value: object) -> object:
  """Tira espaços e passa para minúsculas.

  A categoria é obrigatória: texto vazio, `None` e outros tipos seguem para o
  Enum, que os recusa.
  """
  if isinstance(value, str):
    return value.strip().lower()
  return value


CategoryInput = Annotated[HabitCategory, BeforeValidator(_normalize_category)]


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
