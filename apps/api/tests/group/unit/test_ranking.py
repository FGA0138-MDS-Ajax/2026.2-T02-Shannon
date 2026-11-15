from datetime import date
from uuid import UUID

from app.goals.models import GoalPeriod
from app.group.ranking import assign_positions, score_by_check_ins, score_by_goals
from tests.goals.unit.test_streak import Rule

ANA = UUID("a0000000-0000-4000-8000-000000000001")
BIA = UUID("b0000000-0000-4000-8000-000000000002")
CAIO = UUID("c0000000-0000-4000-8000-000000000003")
DUDA = UUID("d0000000-0000-4000-8000-000000000004")


def nov(*dias: int) -> set[date]:
  return {date(2026, 11, dia) for dia in dias}


def out(*dias: int) -> set[date]:
  return {date(2026, 10, dia) for dia in dias}


def semanal_2x(starts_on: date = date(2026, 11, 2)) -> Rule:
  # Semana de segunda a domingo; 02/11/2026 é segunda.
  return Rule(
    GoalPeriod.WEEK, target_count=2, period_end_weekday=7, starts_on=starts_on
  )


def positions(result: list[tuple[int, UUID, str, int]]) -> list[tuple[int, str]]:
  return [(position, username) for position, _, username, _ in result]


# score_by_check_ins ----------------------------------------------------------


def test_check_ins_same_day_in_two_habits_counts_once() -> None:
  days_by_habit = [nov(2, 3), nov(3, 4)]

  assert score_by_check_ins(days_by_habit, date(2026, 11, 30)) == 3


def test_check_ins_days_after_reference_do_not_count() -> None:
  assert score_by_check_ins([nov(10, 11, 12)], date(2026, 11, 11)) == 2


def test_check_ins_without_days_scores_zero() -> None:
  assert score_by_check_ins([], date(2026, 11, 11)) == 0
  assert score_by_check_ins([set(), set()], date(2026, 11, 11)) == 0


# score_by_goals --------------------------------------------------------------


def test_goals_daily_counts_each_day_with_check_in() -> None:
  goal = Rule(GoalPeriod.DAY, starts_on=date(2026, 11, 1))

  assert score_by_goals(goal, nov(1, 2, 4), date(2026, 11, 5)) == 3


def test_goals_weekly_counts_only_met_weeks() -> None:
  # Semana de 02 a 08 cumprida (2 dias); semana de 09 a 15 com 1 dia só.
  assert score_by_goals(semanal_2x(), nov(2, 3, 9), date(2026, 11, 15)) == 1


def test_goals_monthly_counts_only_met_months() -> None:
  goal = Rule(GoalPeriod.MONTH, target_count=3, starts_on=date(2026, 10, 1))
  days = out(5, 10, 20) | nov(2, 3)

  assert score_by_goals(goal, days, date(2026, 11, 30)) == 1


def test_goals_week_in_progress_counts_when_already_met() -> None:
  # Quarta, 11/11: a semana só fecha no domingo, mas já tem os 2 dias.
  assert score_by_goals(semanal_2x(), nov(9, 10), date(2026, 11, 11)) == 1


def test_goals_month_in_progress_counts_when_already_met() -> None:
  goal = Rule(GoalPeriod.MONTH, target_count=3, starts_on=date(2026, 11, 1))

  assert score_by_goals(goal, nov(2, 3, 4), date(2026, 11, 11)) == 1


def test_goals_week_in_progress_not_met_does_not_count() -> None:
  assert score_by_goals(semanal_2x(), nov(9), date(2026, 11, 11)) == 0


def test_goals_days_after_reference_do_not_count() -> None:
  # O dia 12 completaria a semana, mas vem depois da referência.
  assert score_by_goals(semanal_2x(), nov(10, 12), date(2026, 11, 11)) == 0

  daily = Rule(GoalPeriod.DAY, starts_on=date(2026, 11, 1))
  assert score_by_goals(daily, nov(10, 11, 12), date(2026, 11, 11)) == 2


def test_goals_reference_before_goal_start_scores_zero() -> None:
  goal = semanal_2x(starts_on=date(2026, 11, 9))

  assert score_by_goals(goal, nov(9, 10), date(2026, 11, 8)) == 0


# assign_positions ------------------------------------------------------------


def test_positions_tie_shares_position_and_skips_next() -> None:
  result = assign_positions([(ANA, "ana", 5), (BIA, "bia", 5), (CAIO, "caio", 2)])

  assert positions(result) == [(1, "ana"), (1, "bia"), (3, "caio")]


def test_positions_tie_in_the_middle() -> None:
  scores = [(ANA, "ana", 9), (BIA, "bia", 4), (CAIO, "caio", 4), (DUDA, "duda", 1)]

  assert positions(assign_positions(scores)) == [
    (1, "ana"),
    (2, "bia"),
    (2, "caio"),
    (4, "duda"),
  ]


def test_positions_everyone_with_zero_is_first() -> None:
  result = assign_positions([(CAIO, "caio", 0), (ANA, "ana", 0), (BIA, "bia", 0)])

  assert positions(result) == [(1, "ana"), (1, "bia"), (1, "caio")]


def test_positions_orders_by_score_then_username() -> None:
  scores = [(CAIO, "caio", 2), (BIA, "bia", 7), (ANA, "ana", 2)]

  assert assign_positions(scores) == [
    (1, BIA, "bia", 7),
    (2, ANA, "ana", 2),
    (2, CAIO, "caio", 2),
  ]


def test_positions_empty_list() -> None:
  assert assign_positions([]) == []
