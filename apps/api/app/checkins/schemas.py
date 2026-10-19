import re
from datetime import datetime, timedelta
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

# dias, horas, minutos e segundos (ex.: PT30M, PT1H15M, P1DT2H, PT0.5S).
ISO_8601_DURATION = re.compile(
  r"P(?!$)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?"
)
MSG_DURATION_FORMAT = "A duração deve estar no formato ISO 8601 (ex.: PT30M)."


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


class CheckInPublic(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: UUID
  habit_id: UUID
  user_id: UUID
  created_at: datetime
  duration: timedelta | None
