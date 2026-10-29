from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals import service
from app.goals.exceptions import (
  MSG_GOAL_HABIT_FINISHED,
  MSG_GOAL_NOT_FOUND,
  GoalHabitFinishedError,
  GoalNotFoundError,
)
from app.goals.responses import RESPONSES_PROGRESS, RESPONSES_SET_GOAL
from app.goals.schemas import GoalInput, GoalPublic, HabitProgressPublic
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


@goals_router.get(
  "/habits/{habit_id}/progress",
  response_model=HabitProgressPublic,
  status_code=status.HTTP_200_OK,
  summary="Acompanhamento do hábito",
  description=(
    "Devolve a meta do hábito e o progresso **calculado na hora**: nada é"
    " gravado, então editar ou excluir um check-in muda o resultado na próxima"
    " consulta. Conta só os check-ins do autor, a partir do `starts_on` da meta,"
    " com os dias no horário de Brasília e um check-in por dia. Quem vê o hábito"
    " (autor ou hábito público) vê o progresso do autor.\n\n"
    "`status` do período atual:\n"
    "- `completed`: a meta do período já foi cumprida.\n"
    "- `in_progress`: ainda falta, e há dias livres de sobra.\n"
    "- `at_risk`: faltam tantos check-ins quanto dias livres; precisa de"
    " check-in em todos.\n"
    "- `failed`: não dá mais para cumprir a meta neste período.\n"
    "- `ended`: hábito encerrado; o progresso para no dia do encerramento.\n\n"
    "O período atual só soma ao `current_streak` depois de cumprido, mas nunca"
    " o zera antes de acabar."
  ),
  responses=RESPONSES_PROGRESS,
)
def get_habit_progress(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitProgressPublic:
  """Devolve a meta e o progresso de um hábito visível ao usuário."""
  try:
    return service.get_habit_progress(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except GoalNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GOAL_NOT_FOUND) from None
