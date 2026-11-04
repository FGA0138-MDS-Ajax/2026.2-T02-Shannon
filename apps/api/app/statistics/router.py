from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.statistics import service
from app.statistics.responses import RESPONSES_STATISTICS
from app.statistics.schemas import StatisticsQuery, UserStatistics

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
