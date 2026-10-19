from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.habit.models import HabitStatus


class HabitPublic(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id : UUID
    name : str
    description : str | None
    category : str | None
    is_public : bool
    status : HabitStatus
    author_user_id : UUID
    created_at : date
    target_end_date : date | None
    finished_at : date | None



    

