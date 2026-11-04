from datetime import date, timedelta

from app.statistics.schemas import StatisticsMode


def window_starts(today: date, mode: StatisticsMode) -> tuple[date, date]:
  """Início da "semana" e do "mês" dos cartões. O fim é sempre `today`."""
  if mode == StatisticsMode.ROLLING:
    return (today - timedelta(days=6), today - timedelta(days=29))

  week_start = today - timedelta(days=today.isoweekday() - 1)
  return (week_start, today.replace(day=1))


def days_window(today: date, days: int) -> tuple[date, date]:
  """Janela de `days` dias que termina hoje, contando hoje."""
  return (today - timedelta(days=days - 1), today)
