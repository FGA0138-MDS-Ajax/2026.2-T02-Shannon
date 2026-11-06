from datetime import date
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.goals.repository import APP_TIMEZONE_NAME
from app.habits import service as habits_service
from app.habits.models import Habit, HabitStatus
from app.statistics import repository as statistics_repository
from app.statistics.calculations import (
  calculate_activity_streak,
  days_window,
  fill_series,
  window_starts,
)
from app.statistics.schemas import (
  ActivityStreak,
  AtRiskSummary,
  CheckInsSummary,
  CompletedHabitsSummary,
  CompletionRate,
  GoalCompletion,
  HabitsSummary,
  HabitStatisticsItem,
  Series,
  StatisticsMode,
  StatisticsQuery,
  UserStatistics,
)


def get_user_statistics(
  db: Session, user: User, query: StatisticsQuery
) -> UserStatistics:
  today = habits_service.today()
  habits = habits_service.list_my_habits(db, user)

  habit_ids_with_goal = [habit.id for habit in habits if habit.goal is not None]
  days_by_habit = goals_repository.list_check_in_days(db, habit_ids_with_goal)

  window_start, window_end = days_window(today, query.days)

  habit_progress = build_habit_progress_block(
    habits, days_by_habit, today, window_start
  )

  return UserStatistics(
    reference_date=today,
    timezone=APP_TIMEZONE_NAME,
    mode=query.mode,
    habits=build_habits_block(habits),
    check_ins=build_check_ins_block(db, user.id, today, query.mode),
    completed_habits=build_completed_habits_block(
      habits, days_by_habit, today, query.mode
    ),
    goal_completion=build_goal_completion_block(
      habits, days_by_habit, today, window_start, query.days
    ),
    activity_streak=build_activity_streak_block(db, user.id, today),
    at_risk=build_at_risk_block(habit_progress),
    habit_progress=habit_progress,
    series=build_series_block(db, user.id, window_start, window_end),
  )


def build_habits_block(habits: list[Habit]) -> HabitsSummary:
  """Conta os hábitos do usuário, com e sem meta. Não consulta o banco."""
  active = sum(habit.status == HabitStatus.ACTIVE for habit in habits)
  finished = sum(habit.status == HabitStatus.FINISHED for habit in habits)

  return HabitsSummary(total=len(habits), active=active, finished=finished)


def build_habit_progress_block(
  habits: list[Habit],
  days_by_habit: dict[UUID, set[date]],
  today: date,
  window_start: date,
) -> list[HabitStatisticsItem]:
  return []


def build_at_risk_block(items: list[HabitStatisticsItem]) -> AtRiskSummary:
  return AtRiskSummary(count=0, habit_ids=[])


def build_check_ins_block(
  db: Session, user_id: UUID, today: date, mode: StatisticsMode
) -> CheckInsSummary:
  """Monta o resumo de check-ins do usuário para o período selecionado."""

  week_start, month_start = window_starts(today, mode)

  total, today_count, week_count, month_count = statistics_repository.count_check_ins(
    db, user_id, today, week_start, month_start
  )

  return CheckInsSummary(
    total=total,
    today=today_count,
    week=week_count,
    month=month_count,
  )


def build_series_block(db: Session, user_id: UUID, start: date, end: date) -> Series:
  """Monta a série diária de check-ins dentro do intervalo solicitado."""

  counts = statistics_repository.count_check_ins_by_day(db, user_id, start, end)

  points = fill_series(counts, start, end)

  return Series(start=start, end=end, points=points)


def build_activity_streak_block(
  db: Session, user_id: UUID, today: date
) -> ActivityStreak:
  """Calcula a sequência atual e o recorde de dias com check-ins."""

  activity_days = statistics_repository.list_user_check_in_days(db, user_id)

  return calculate_activity_streak(activity_days, today)


def build_completed_habits_block(
  habits: list[Habit],
  days_by_habit: dict[UUID, set[date]],
  today: date,
  mode: StatisticsMode,
) -> CompletedHabitsSummary:
  return CompletedHabitsSummary(today=0, week=0, month=0)


def build_goal_completion_block(
  habits: list[Habit],
  days_by_habit: dict[UUID, set[date]],
  today: date,
  window_start: date,
  days: int,
) -> GoalCompletion:
  return GoalCompletion(completed_periods=0, total_periods=0, rate=0.0, days=days)


def build_consistency(
  habit: Habit, days: set[date], today: date, window_start: date
) -> CompletionRate:
  return CompletionRate(completed_periods=0, total_periods=0, rate=0.0)
