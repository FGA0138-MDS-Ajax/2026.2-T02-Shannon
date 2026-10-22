import re
from datetime import datetime, timedelta
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
  BaseModel,
  BeforeValidator,
  Field,
  StringConstraints,
  model_validator,
)

# dias, horas, minutos e segundos (ex.: PT30M, PT1H15M, P1DT2H, PT0.5S).
ISO_8601_DURATION = re.compile(
  r"P(?!$)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?"
)
MSG_DURATION_FORMAT = "A duração deve estar no formato ISO 8601 (ex.: PT30M)."
MSG_TITLE_NULL = "O título não pode ser nulo."


def _require_iso8601(value: object) -> object:
  """Aceita só texto ISO 8601. Recusa segundos (`1800`) e `HH:MM:SS`.

  `timedelta` passa direto, para o código Python montar o schema sem converter.
  """
  if isinstance(value, timedelta):
    return value
  if isinstance(value, str) and ISO_8601_DURATION.fullmatch(value):
    return value
  raise ValueError(MSG_DURATION_FORMAT)


PositiveDuration = Annotated[
  timedelta, BeforeValidator(_require_iso8601), Field(gt=timedelta(0))
]


def _blank_to_none(value: object) -> object:
  """Texto vazio ou só com espaços vira `None`; o resto segue sem mudança."""
  if isinstance(value, str) and not value.strip():
    return None
  return value


CheckInTitle = Annotated[
  str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)
]
# O BeforeValidator fica fora do `| None`: dentro do ramo `str`, o `None` gerado
# seria recusado. Uso: `description: CheckInDescription = None`.
CheckInDescription = Annotated[
  Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None,
  BeforeValidator(_blank_to_none),
]


class CheckInPublic(BaseModel):
  """Resposta de check-in. Monte com `build_check_ins_public`, não com
  `model_validate`: `habit_ids` não é coluna de `CheckIn`.
  """

  id: UUID
  user_id: UUID
  title: str
  description: str | None
  created_at: datetime
  duration: timedelta | None
  habit_ids: list[UUID]


class CheckInUpdate(BaseModel):
  """Corpo do `PATCH /check-ins/{check_in_id}`: só os campos enviados mudam.

  `title: null` é recusado. `description` vazia e `duration: null` apagam o
  valor. `habit_ids`, `user_id` e `created_at` enviados no corpo são ignorados.
  """

  title: CheckInTitle | None = None
  description: CheckInDescription = None
  duration: PositiveDuration | None = None

  @model_validator(mode="after")
  def reject_null_title(self) -> Self:
    """Recusa `title` enviado explicitamente como `null`."""
    if "title" in self.model_fields_set and self.title is None:
      raise ValueError(MSG_TITLE_NULL)
    return self
