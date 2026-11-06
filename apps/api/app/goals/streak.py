from calendar import monthrange
from collections import Counter
from collections.abc import Iterable
from datetime import date, timedelta
from enum import StrEnum
from typing import Protocol

from pydantic import BaseModel

from app.goals.models import GoalPeriod


class GoalRule(Protocol):
  """O que o motor precisa da meta. O modelo `Goal` já atende."""

  period: str
  target_count: int
  period_end_weekday: int | None
  starts_on: date


class ProgressStatus(StrEnum):
  COMPLETED = "completed"
  IN_PROGRESS = "in_progress"
  AT_RISK = "at_risk"
  FAILED = "failed"
  ENDED = "ended"


class PeriodProgress(BaseModel):
  start: date
  end: date
  done: int
  target_count: int


class GoalProgress(BaseModel):
  current_period: PeriodProgress
  status: ProgressStatus
  current_streak: int
  best_streak: int
  streak_started_on: date | None
  consistent_days: int


def period_bounds(goal: GoalRule, day: date) -> tuple[date, date]:
  if goal.period == GoalPeriod.DAY:
    return (day, day)
  if goal.period == GoalPeriod.WEEK:
    dias_ate_o_fechamento = (goal.period_end_weekday - day.isoweekday()) % 7
    end = day + timedelta(days=dias_ate_o_fechamento)
    start = end - timedelta(days=6)
    return (start, end)
  if goal.period == GoalPeriod.MONTH:
    last = monthrange(day.year, day.month)[1]
    start = day.replace(day=1)
    end = day.replace(day=last)
    return (start, end)
  raise ValueError(f"Período de meta desconhecido: {goal.period}")


def calculate_progress(
  goal: GoalRule, days: Iterable[date], today: date, finished_at: date | None = None
) -> GoalProgress:

  reference = finished_at or today

  valid_days = {day for day in days if goal.starts_on <= day <= reference}
  target = goal.target_count

  done_by_end = Counter(period_bounds(goal, day)[1] for day in valid_days)

  start, end = period_bounds(goal, reference)

  done = done_by_end[end]

  def is_met(period_end: date) -> bool:
    return done_by_end[period_end] >= target

  # Streak atual: o período atual só soma se já estiver cumprido, mas nunca zera
  # a sequência. Depois recua período a período até o primeiro não cumprido.
  current_streak = 1 if is_met(end) else 0
  first_end_of_run = end if current_streak else None
  cursor = start - timedelta(days=1)

  while True:
    p_start, p_end = period_bounds(goal, cursor)

    if not is_met(p_end):
      break

    current_streak += 1
    first_end_of_run = p_end
    cursor = p_start - timedelta(days=1)

  # Início da constância: o 1º check-in do período mais antigo da sequência. Sem
  # sequência, mas com check-in no período atual, é uma retomada e conta dali.
  run_end = first_end_of_run if current_streak else (end if done else None)
  streak_started_on = None
  if run_end is not None:
    streak_started_on = min(
      d for d in valid_days if period_bounds(goal, d)[1] == run_end
    )

  consistent_days = (reference - streak_started_on).days + 1 if streak_started_on else 0

  best_streak = 0
  run = 0
  previous_end = None
  for p_end in sorted(e for e in done_by_end if is_met(e)):
    p_start = period_bounds(goal, p_end)[0]
    run = run + 1 if previous_end == p_start - timedelta(days=1) else 1
    best_streak = max(best_streak, run)
    previous_end = p_end

  # Status: compara o que falta com os dias livres até o fim do período (hoje só
  # conta como livre se ainda não teve check-in). Hábito encerrado é sempre `ended`.
  missing = target - done
  available = (end - reference).days + 1 - (1 if reference in valid_days else 0)
  if finished_at is not None:
    status = ProgressStatus.ENDED
  elif missing <= 0:
    status = ProgressStatus.COMPLETED
  elif missing > available:
    status = ProgressStatus.FAILED
  elif missing == available:
    status = ProgressStatus.AT_RISK
  else:
    status = ProgressStatus.IN_PROGRESS

  return GoalProgress(
    current_period=PeriodProgress(start=start, end=end, done=done, target_count=target),
    status=status,
    current_streak=current_streak,
    best_streak=best_streak,
    streak_started_on=streak_started_on,
    consistent_days=consistent_days,
  )


class PeriodResult(BaseModel):
  start: date
  end: date
  done: int
  target_count: int
  met: bool


def completion_dates(
  goal: GoalRule,
  days: Iterable[date],
  today: date,
  finished_at: date | None = None,
) -> list[date]:
  """Dia em que cada período da meta foi cumprido (o `target_count`-ésimo dia).

  Período que não chegou à meta não gera data. Cada período gera no máximo uma.
  """
  reference = finished_at or today
  grouped = _group_days_by_period(goal, days, reference)

  return [
    period_days[goal.target_count - 1]
    for period_days in grouped.values()
    if len(period_days) >= goal.target_count
  ]


def period_results(
  goal: GoalRule,
  days: Iterable[date],
  window_start: date,
  window_end: date,
  today: date,
  finished_at: date | None = None,
) -> list[PeriodResult]:
  """Períodos da janela que contam para a taxa, em ordem de `end`.

  Fechado entra sempre; aberto e primeiro período parcial só se cumpridos.
  """
  reference = finished_at or today
  first_day = max(window_start, goal.starts_on)
  last_day = min(window_end, reference)

  window_floor = period_bounds(goal, first_day)[0]
  window_days = [day for day in days if window_floor <= day <= last_day]
  grouped = _group_days_by_period(goal, window_days, reference)

  results: list[PeriodResult] = []
  cursor = first_day
  while cursor <= last_day:
    start, end = period_bounds(goal, cursor)
    cursor = end + timedelta(days=1)

    if not window_start <= end <= window_end:
      continue

    done = len(grouped.get(end, []))
    met = done >= goal.target_count

    is_open = end >= reference
    is_first_partial = start < goal.starts_on
    if (is_open or is_first_partial) and not met:
      continue

    results.append(
      PeriodResult(
        start=start,
        end=end,
        done=done,
        target_count=goal.target_count,
        met=met,
      )
    )
  return results


def _group_days_by_period(
  goal: GoalRule, days: Iterable[date], reference: date
) -> dict[date, list[date]]:
  """Agrupa os dias válidos pelo `end` do período, com os dias em ordem.

  Dia válido: entre `starts_on` e a referência, sem repetidos.
  """
  valid_days = {day for day in days if goal.starts_on <= day <= reference}

  grouped: dict[date, list[date]] = {}
  for day in sorted(valid_days):
    period_end = period_bounds(goal, day)[1]
    grouped.setdefault(period_end, []).append(day)
  return grouped
