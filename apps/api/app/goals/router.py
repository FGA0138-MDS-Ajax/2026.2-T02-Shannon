from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals import service
from app.goals.exceptions import MSG_GOAL_HABIT_FINISHED, GoalHabitFinishedError
from app.goals.responses import RESPONSES_SET_GOAL
from app.goals.schemas import GoalInput, GoalPublic
from app.habits.exceptions import (
  MSG_HABIT_FORBIDDEN,
  MSG_HABIT_NOT_FOUND,
  HabitForbiddenError,
  HabitNotFoundError,
)

goals_router = APIRouter(prefix="/goals", tags=["goals"])


@goals_router.put(
  "/habits/{habit_id}/goal",
  response_model=GoalPublic,
  status_code=status.HTTP_200_OK,
  summary="Definir meta do hábito",
  description=(
    "Cria ou troca a meta de um hábito do usuário logado. A meta é sempre"
    " enviada inteira. Trocar o período, a quantidade ou o dia de fechamento"
    " **reinicia o streak**: `starts_on` passa a ser hoje. Enviar a mesma meta"
    " não muda nada. Hábitos antigos, sem meta, passam a ter uma. Hábito"
    " encerrado não permite alterar a meta."
  ),
  responses=RESPONSES_SET_GOAL,
)
def set_goal(
  db: SessionDep,
  habit_id: UUID,
  data: GoalInput,
  user: Annotated[User, Depends(get_current_user)],
) -> GoalPublic:
  """Cria ou troca a meta de um hábito do autor."""
  try:
    return service.set_goal(db, habit_id, user, data)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except HabitForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_HABIT_FORBIDDEN) from None
  except GoalHabitFinishedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_GOAL_HABIT_FINISHED) from None
