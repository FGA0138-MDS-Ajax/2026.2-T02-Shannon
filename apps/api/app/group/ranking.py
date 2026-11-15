from collections.abc import Iterable
from datetime import date
from uuid import UUID

from app.goals.streak import GoalRule, period_bounds, period_results


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
