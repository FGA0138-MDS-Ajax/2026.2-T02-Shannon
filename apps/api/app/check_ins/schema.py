from datetime import datetime, timedelta
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

PositiveDuration = Annotated[timedelta, Field(gt=timedelta(0))]


class CheckInPublic(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: UUID
  habit_id: UUID
  user_id: UUID
  created_at: datetime
  duration: timedelta | None
