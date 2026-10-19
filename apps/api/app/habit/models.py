from datetime import datetime, date
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, func, DateTime
from enum import Enum


class HabitStatus(str, Enum):
    ACTIVE = "active"
    FINISHED = "finished"


class Habit(SQLModel, table = True):

    __tablename__ = "habits"

    id : UUID = Field(default_factory=uuid4, primary_key=True)
    name : str = Field(max_length=100, nullable=False)
    description : str | None = Field(max_length= 500, nullable=True, default= None)
    category : str | None = Field(max_length=100, nullable=True, default= None)
    is_public : bool = Field(default=False, nullable= False)
    status : HabitStatus = Field(default= HabitStatus.ACTIVE, nullable=False, index=True)
    author_user_id : UUID = Field(foreign_key="users.id", nullable= False, ondelete="CASCADE", index=True)
    created_at : date = Field(nullable=False)
    target_end_date: date | None = Field(default=None)
    finished_at: date | None = Field(default=None)


