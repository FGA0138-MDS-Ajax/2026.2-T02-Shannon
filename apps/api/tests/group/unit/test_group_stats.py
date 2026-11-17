from datetime import date
from uuid import UUID

from app.goals.models import GoalPeriod
from app.goals.streak import GoalProgress, PeriodProgress, ProgressStatus
from app.group.stats import pick_best_record, pick_most_consistent

ANA = UUID("a0000000-0000-4000-8000-000000000001")
BIA = UUID("b0000000-0000-4000-8000-000000000002")
CAIO = UUID("c0000000-0000-4000-8000-000000000003")
H1 = UUID("10000000-0000-4000-8000-000000000001")
H2 = UUID("20000000-0000-4000-8000-000000000002")
H3 = UUID("30000000-0000-4000-8000-000000000003")


def progress(
  consistent_days: int = 0, best_streak: int = 0, current_streak: int = 0
) -> GoalProgress:
  day = date(2026, 11, 11)
  return GoalProgress(
    current_period=PeriodProgress(start=day, end=day, done=0, target_count=1),
    status=ProgressStatus.IN_PROGRESS,
    current_streak=current_streak,
    best_streak=best_streak,
    streak_started_on=None,
    consistent_days=consistent_days,
  )


# pick_most_consistent --------------------------------------------------------


def test_most_consistent_empty_list_returns_none() -> None:
  assert pick_most_consistent([]) is None


def test_most_consistent_all_zero_returns_none() -> None:
  entries = [
    (ANA, "ana", H1, "Correr", progress(consistent_days=0, best_streak=4)),
    (BIA, "bia", H2, "Ler", progress(consistent_days=0)),
  ]

  assert pick_most_consistent(entries) is None


def test_most_consistent_picks_highest_consistent_days() -> None:
  winner = (CAIO, "caio", H3, "Nadar", progress(consistent_days=12))
  entries = [
    (ANA, "ana", H1, "Correr", progress(consistent_days=5)),
    winner,
    (BIA, "bia", H2, "Ler", progress(consistent_days=11)),
  ]

  assert pick_most_consistent(entries) == winner


def test_most_consistent_compares_days_not_periods() -> None:
  # Diária: 7 períodos = 7 dias. Semanal: 2 períodos, mas 16 dias corridos.
  daily = (ANA, "ana", H1, "Correr", progress(consistent_days=7, current_streak=7))
  weekly = (BIA, "bia", H2, "Ler", progress(consistent_days=16, current_streak=2))

  assert pick_most_consistent([daily, weekly]) == weekly
  assert pick_most_consistent([weekly, daily]) == weekly


def test_most_consistent_tie_breaks_by_username_then_habit_name() -> None:
  bia = (BIA, "bia", H1, "Alongar", progress(consistent_days=5))
  ana_zumba = (ANA, "ana", H2, "Zumba", progress(consistent_days=5))
  ana_correr = (ANA, "ana", H3, "Correr", progress(consistent_days=5))

  # O username vem antes do nome do hábito, e a ordem da lista não importa.
  assert pick_most_consistent([bia, ana_zumba]) == ana_zumba
  assert pick_most_consistent([ana_zumba, ana_correr, bia]) == ana_correr
  assert pick_most_consistent([bia, ana_correr, ana_zumba]) == ana_correr


def test_most_consistent_full_tie_is_stable_by_habit_id() -> None:
  first = (ANA, "ana", H1, "Ler", progress(consistent_days=5))
  second = (ANA, "ana", H2, "Ler", progress(consistent_days=5))

  assert pick_most_consistent([first, second]) == first
  assert pick_most_consistent([second, first]) == first


# pick_best_record ------------------------------------------------------------


def test_best_record_empty_list_returns_none() -> None:
  assert pick_best_record([]) is None


def test_best_record_all_zero_returns_none() -> None:
  entries = [
    (ANA, "ana", H1, "Correr", GoalPeriod.DAY, progress(consistent_days=9)),
    (BIA, "bia", H2, "Ler", GoalPeriod.WEEK, progress(current_streak=3)),
  ]

  assert pick_best_record(entries) is None


def test_best_record_keeps_the_unit_of_the_winning_goal() -> None:
  weekly = (BIA, "bia", H2, "Ler", GoalPeriod.WEEK, progress(best_streak=5))
  entries = [
    (ANA, "ana", H1, "Correr", GoalPeriod.DAY, progress(best_streak=4)),
    weekly,
    (CAIO, "caio", H3, "Poupar", GoalPeriod.MONTH, progress(best_streak=2)),
  ]

  winner = pick_best_record(entries)

  assert winner == weekly
  assert winner is not None
  assert winner[4] == GoalPeriod.WEEK


def test_best_record_uses_best_streak_only() -> None:
  veteran = (
    ANA,
    "ana",
    H1,
    "Correr",
    GoalPeriod.DAY,
    progress(best_streak=3, current_streak=3, consistent_days=30),
  )
  past_record = (
    BIA,
    "bia",
    H2,
    "Ler",
    GoalPeriod.MONTH,
    progress(best_streak=8, current_streak=0, consistent_days=0),
  )

  assert pick_best_record([veteran, past_record]) == past_record


def test_best_record_tie_breaks_by_username_then_habit_name() -> None:
  bia = (BIA, "bia", H1, "Alongar", GoalPeriod.DAY, progress(best_streak=4))
  ana_zumba = (ANA, "ana", H2, "Zumba", GoalPeriod.WEEK, progress(best_streak=4))
  ana_correr = (ANA, "ana", H3, "Correr", GoalPeriod.MONTH, progress(best_streak=4))

  assert pick_best_record([bia, ana_zumba, ana_correr]) == ana_correr
  assert pick_best_record([ana_correr, ana_zumba, bia]) == ana_correr
