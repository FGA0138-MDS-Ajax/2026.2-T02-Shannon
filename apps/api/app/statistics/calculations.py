from dataclasses import dataclass
from datetime import date, timedelta

from app.goals.models import GoalPeriod
from app.goals.streak import PeriodResult, calculate_progress
from app.statistics.schemas import (
  ActivityStreak,
  CompletionRate,
  SeriesPoint,
  StatisticsMode,
)


def window_starts(today: date, mode: StatisticsMode) -> tuple[date, date]:
  """Início da semana e do mês dos cartões. O fim é sempre `today`."""
  if mode == StatisticsMode.ROLLING:
    return (today - timedelta(days=6), today - timedelta(days=29))

  week_start = today - timedelta(days=today.isoweekday() - 1)
  return (week_start, today.replace(day=1))


def days_window(today: date, days: int) -> tuple[date, date]:
  """Janela de `days` dias que termina hoje, contando hoje."""
  return (today - timedelta(days=days - 1), today)


def to_completion_rate(results: list[PeriodResult]) -> CompletionRate:
  """Resume os períodos em uma taxa de 0 a 100. Sem períodos, a taxa é `0.0`.

  Só o `rate` é arredondado. `total_periods: 0` indica que ainda não há dados.
  """
  total = len(results)
  if total == 0:
    return CompletionRate(completed_periods=0, total_periods=0, rate=0.0)

  completed = sum(result.met for result in results)

  return CompletionRate(
    completed_periods=completed,
    total_periods=total,
    rate=round(completed / total * 100, 1),
  )


def fill_series(counts: dict[date, int], start: date, end: date) -> list[SeriesPoint]:
  """Cria um ponto para cada dia do intervalo, preenchendo ausências com zero."""
  points = []
  current_day = start

  """Percorre o intervalo inteiro, incluindo as datas inicial e final."""
  while current_day <= end:
    points.append(
      SeriesPoint(
        date=current_day,
        count=counts.get(current_day, 0),
      )
    )
    current_day += timedelta(days=1)

  return points


@dataclass(frozen=True)
class ActivityRule:
  """Regra diária sintética para reutilizar o motor de streak das metas."""

  period: str
  target_count: int
  period_end_weekday: int | None
  starts_on: date


def calculate_activity_streak(days: set[date], today: date) -> ActivityStreak:
  """Calcula o streak geral usando o motor existente de progresso."""
  """Uma meta diária com início mínimo representa qualquer check-in histórico."""
  activity_rule = ActivityRule(
    period=GoalPeriod.DAY,
    target_count=1,
    period_end_weekday=None,
    starts_on=date.min,
  )

  """Reaproveita as regras de sequência já implementadas na Sprint 3."""
  progress = calculate_progress(
    goal=activity_rule,
    days=days,
    today=today,
  )

  return ActivityStreak(
    current=progress.current_streak,
    best=progress.best_streak,
  )
