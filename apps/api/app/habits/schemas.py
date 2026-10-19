from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.habits.models import HabitStatus


class HabitPublic(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: UUID
  name: str
  description: str | None
  category: str | None
  is_public: bool
  status: HabitStatus
  author_user_id: UUID
  created_at: date
  target_end_date: date | None
  finished_at: date | None
