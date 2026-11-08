from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals.exceptions import MSG_GOAL_NOT_FOUND, GoalNotFoundError
from app.habits.exceptions import (
  MSG_HABIT_NOT_FOUND,
  HabitForbiddenError,
  HabitNotFoundError,
)
from app.statistics import service
from app.statistics.responses import RESPONSES_CALENDAR, RESPONSES_STATISTICS
from app.statistics.schemas import (
  CalendarQuery,
  HabitCalendar,
  StatisticsQuery,
  UserStatistics,
)

statistics_router = APIRouter(prefix="/user/statistics", tags=["statistics"])


@statistics_router.get(
  "",
  response_model=UserStatistics,
  status_code=status.HTTP_200_OK,
  summary="Estatísticas do usuário",
  description=(
    "Devolve as estatísticas do usuário logado: hábitos, check-ins, metas,"
    " sequência de atividade, hábitos em risco e a série diária. Tudo é"
    " calculado na hora, considerando o dia no fuso de São Paulo.\n\n"
    "- `mode`: como contar a semana e o mês dos cartões. `calendar` (padrão)"
    " usa a semana de segunda a domingo e o mês desde o dia 1; `rolling` usa"
    " os últimos 7 e 30 dias, contando hoje.\n"
    "- `days`: tamanho da janela, em dias, que termina hoje (padrão 30, de 1 a"
    " 365). Vale para a taxa de metas cumpridas, a constância dos hábitos e a"
    " série."
  ),
  responses=RESPONSES_STATISTICS,
)
def get_user_statistics(
  db: SessionDep,
  query: Annotated[StatisticsQuery, Query()],
  user: Annotated[User, Depends(get_current_user)],
) -> UserStatistics:
  """Devolve as estatísticas do usuário logado."""
  return service.get_user_statistics(db, user, query)


@statistics_router.get(
  "/habits/{habit_id}/calendar",
  response_model=HabitCalendar,
  status_code=status.HTTP_200_OK,
  summary="Calendário do hábito",
  description=(
    "Devolve o calendário de um mês para um hábito do usuário logado, com o"
    " estado de cada dia:\n\n"
    "- `outside`: fora da vida do hábito (antes do início da meta, depois do"
    " encerramento do hábito ou depois de hoje).\n"
    "- `completed`: o dia tem check-in e o período da meta que contém o dia foi"
    " cumprido.\n"
    "- `partial`: o dia tem check-in, mas o período não foi cumprido (aberto ou"
    " fechado).\n"
    "- `none`: dentro da vida do hábito e sem check-in.\n\n"
    "Na meta diária, `partial` nunca aparece: o dia com check-in é sempre"
    " `completed`."
  ),
  responses=RESPONSES_CALENDAR,
)
def get_habit_calendar(
  db: SessionDep,
  habit_id: UUID,
  query: Annotated[CalendarQuery, Query()],
  user: Annotated[User, Depends(get_current_user)],
) -> HabitCalendar:
  """Devolve o calendário mensal de um hábito do usuário."""
  try:
    return service.get_habit_calendar(db, habit_id, user, query)
  except (HabitNotFoundError, HabitForbiddenError):
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except GoalNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GOAL_NOT_FOUND) from None
