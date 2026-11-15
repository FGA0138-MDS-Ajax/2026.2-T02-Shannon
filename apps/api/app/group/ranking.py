from collections.abc import Iterable
from datetime import date
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.goals.streak import GoalRule, period_bounds, period_results
from app.group import repository
from app.group.models import RankingCriterion
from app.group.permissions import require_member
from app.group.schemas import RankingItem, RankingMe, RankingResponse, RankingUser
from app.group.status import group_reference_date
from app.habits import repository as habits_repository
from app.habits import service as habits_service


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

  habits = [
    habit
    for habit in habits_repository.list_habits_by_group(db, group_id)
    if habit.goal is not None
  ]
  members = repository.list_members_with_users(db, group_id)
  days = goals_repository.list_check_in_days_by_member(
    db, [habit.id for habit in habits], [member.user_id for member, _ in members]
  )

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
