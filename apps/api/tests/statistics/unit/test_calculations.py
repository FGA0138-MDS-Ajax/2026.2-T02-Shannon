from datetime import date, timedelta

from app.statistics.calculations import (
  calculate_activity_streak,
  fill_series,
  window_starts,
)
from app.statistics.schemas import StatisticsMode


def test_preenche_dias_sem_check_in_com_zero():
  counts = {date(2026, 10, 31): 2}

  points = fill_series(counts, date(2026, 10, 30), date(2026, 11, 1))

  assert [(point.date, point.count) for point in points] == [
    (date(2026, 10, 30), 0),
    (date(2026, 10, 31), 2),
    (date(2026, 11, 1), 0),
  ]


def test_preenche_um_dia_sem_check_in():
  points = fill_series({}, date(2026, 11, 1), date(2026, 11, 1))

  assert len(points) == 1
  assert points[0].date == date(2026, 11, 1)
  assert points[0].count == 0


def test_preenche_trinta_dias_em_ordem_crescente():
  start = date(2026, 10, 3)
  end = date(2026, 11, 1)

  points = fill_series({}, start, end)

  assert len(points) == 30
  assert all(point.count == 0 for point in points)
  assert [point.date for point in points] == [
    start + timedelta(days=offset) for offset in range(30)
  ]


def dias_de_atividade() -> set[date]:
  """Retorna os dias de atividade definidos nos cenários da STAT3."""
  return {
    date(2026, 10, 22),
    date(2026, 10, 23),
    date(2026, 10, 24),
    date(2026, 10, 25),
    date(2026, 10, 28),
    date(2026, 10, 29),
    date(2026, 10, 30),
  }


def test_calcula_streak_atual_e_recorde():
  streak = calculate_activity_streak(dias_de_atividade(), date(2026, 10, 30))

  assert streak.current == 3
  assert streak.best == 4


def test_hoje_sem_check_in_nao_zera_streak():
  streak = calculate_activity_streak(dias_de_atividade(), date(2026, 10, 31))

  assert streak.current == 3
  assert streak.best == 4


def test_um_dia_em_branco_zera_streak_atual():
  streak = calculate_activity_streak(dias_de_atividade(), date(2026, 11, 2))

  assert streak.current == 0
  assert streak.best == 4


def test_sem_atividade_o_streak_e_zero():
  streak = calculate_activity_streak(set(), date(2026, 11, 2))

  assert streak.current == 0
  assert streak.best == 0


def test_calcula_inicio_das_janelas_calendar_e_rolling():
  today = date(2026, 10, 28)

  calendar = window_starts(today, StatisticsMode.CALENDAR)
  rolling = window_starts(today, StatisticsMode.ROLLING)

  assert calendar == (date(2026, 10, 26), date(2026, 10, 1))
  assert rolling == (date(2026, 10, 22), date(2026, 9, 29))
