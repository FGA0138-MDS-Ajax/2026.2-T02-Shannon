from collections.abc import Iterable
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals.streak import GoalRule, period_bounds, period_results
from app.group.exceptions import MSG_GROUP_NOT_FOUND, GroupNotFoundError
from app.group.loading import load_group_data
from app.group.models import RankingCriterion
from app.group.permissions import require_member
from app.group.responses import RESPONSES_RANKING
from app.group.schemas import RankingItem, RankingMe, RankingResponse, RankingUser
from app.group.status import group_reference_date
from app.habits import service as habits_service

ranking_router = APIRouter(prefix="/groups", tags=["groups"])


def score_by_check_ins(days_by_habit: Iterable[set[date]], reference: date) -> int:
  """Dias distintos com check-in no grupo, até `reference`. Pura.

  Recebe os dias de um membro em cada hábito. O mesmo dia em dois hábitos conta
  uma vez.
  """
  distinct_days: set[date] = set().union(*days_by_habit)
  return sum(day <= reference for day in distinct_days)


def score_by_goals(goal: GoalRule, days: Iterable[date], reference: date) -> int:
  """Períodos da meta cumpridos até `reference`, um ponto por período. Pura.

  O período em andamento conta se já estiver cumprido. Dias depois de
  `reference` não contam.
  """
  # A janela vai até o fim do período em andamento: `period_results` descarta o
  # período que termina depois dela, e ele ficaria de fora mesmo cumprido.
  window_end = period_bounds(goal, reference)[1]
  results = period_results(goal, days, goal.starts_on, window_end, today=reference)
  return sum(result.met for result in results)


def assign_positions(
  scores: list[tuple[UUID, str, int]],
) -> list[tuple[int, UUID, str, int]]:
  """Ordena `(user_id, username, score)` e devolve com a posição na frente. Pura.

  Maior pontuação primeiro; o `username` só desempata a ordem de exibição. A
  posição é 1 mais a quantidade de membros com pontuação estritamente maior, então
  empatados dividem a posição e a seguinte é pulada: 1, 1, 3.
  """
  ordered = sorted(scores, key=lambda row: (-row[2], row[1]))
  return [
    (1 + sum(other[2] > score for other in scores), user_id, username, score)
    for user_id, username, score in ordered
  ]


def get_group_ranking(db: Session, group_id: UUID, user: User) -> RankingResponse:
  """Ranking do grupo todo, pelo critério do grupo, calculado a cada pedido.

  Só membros leem. Levanta `GroupNotFoundError` se o grupo não existe ou o
  usuário não é membro. `as_of` é hoje ou o `ends_on` do grupo, o que vier
  primeiro: depois do fim, a pontuação fica congelada. Entram os hábitos ativos e
  encerrados que têm meta e os membros atuais; quem não pontuou aparece com 0.

  Depois da permissão, faz um número fixo de consultas (hábitos com as metas,
  membros e dias de check-in), seja qual for o tamanho do grupo.
  """
  group, _ = require_member(db, group_id, user)
  today = habits_service.today()
  reference = today if group.ends_on is None else min(today, group.ends_on)

  habits, members, days = load_group_data(db, group_id)

  by_check_ins = group.ranking_criterion == RankingCriterion.CHECK_INS
  scores: list[tuple[UUID, str, int]] = []
  for member, member_user in members:
    if by_check_ins:
      score = score_by_check_ins(
        (days.get((habit.id, member.user_id), set()) for habit in habits), reference
      )
    else:
      score = sum(
        score_by_goals(
          habit.goal,
          days.get((habit.id, member.user_id), set()),
          group_reference_date(group, habit, today),
        )
        for habit in habits
      )
    scores.append((member.user_id, member_user.username, score))

  ranked = assign_positions(scores)
  # Quem pede é membro (`require_member`), então sempre está na lista.
  me = next(
    RankingMe(position=position, score=score)
    for position, user_id, _, score in ranked
    if user_id == user.id
  )
  return RankingResponse(
    criterion=group.ranking_criterion,
    as_of=reference,
    items=[
      RankingItem(
        position=position,
        user=RankingUser(id=user_id, username=username),
        score=score,
      )
      for position, user_id, username, score in ranked
    ],
    me=me,
  )


@ranking_router.get(
  "/{group_id}/ranking",
  response_model=RankingResponse,
  status_code=status.HTTP_200_OK,
  summary="Ranking do grupo",
  description=(
    "Ranking único do grupo todo para qualquer **membro**, pelo critério do grupo:"
    " `check_ins` conta os dias distintos com check-in em hábitos do grupo e"
    " `goals` conta os períodos de meta cumpridos, incluindo o período em"
    " andamento se já estiver cumprido. Membros empatados dividem a posição e a"
    " seguinte é pulada (1, 1, 3). Só aparecem os membros atuais; quem não pontuou"
    " vem com 0, e cada um pontua a partir da sua entrada no grupo. `as_of` é a"
    " data até onde o ranking foi calculado: hoje ou, depois do fim do grupo, o"
    " `ends_on`, quando a pontuação fica congelada. `me` traz a posição e a"
    " pontuação de quem pediu. É calculado a cada pedido, então a troca de"
    " critério pelo administrador vale na hora."
  ),
  responses=RESPONSES_RANKING,
)
def get_ranking(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> RankingResponse:
  """Devolve o ranking do grupo para um membro."""
  try:
    return get_group_ranking(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
