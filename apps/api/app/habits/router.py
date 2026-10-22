from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.habits import service
from app.habits.exceptions import MSG_HABIT_NOT_FOUND, HabitNotFoundError
from app.habits.models import HabitStatus
from app.habits.schemas import HabitCreate, HabitPublic

habit_router = APIRouter(prefix="/habits", tags=["habits"])


@habit_router.post("", response_model=HabitPublic, status_code=status.HTTP_201_CREATED)
def create_habit(
  db: SessionDep,
  data: HabitCreate,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  return service.create_habit(db, user, data)


@habit_router.get("", response_model=list[HabitPublic], status_code=status.HTTP_200_OK)
def list_habits(
  db: SessionDep,
  user: Annotated[User, Depends(get_current_user)],
  status_filter: Annotated[HabitStatus | None, Query(alias="status")] = None,
) -> list[HabitPublic]:
  return service.list_my_habits(db, user, status_filter)


@habit_router.get(
  "/{habit_id}", response_model=HabitPublic, status_code=status.HTTP_200_OK
)
def get_habit(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  try:
    return service.get_visible_habit(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
