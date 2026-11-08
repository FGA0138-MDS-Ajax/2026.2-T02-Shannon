from datetime import date
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.goals import service as goals_service
from app.goals.exceptions import GoalNotFoundError
from app.goals.repository import APP_TIMEZONE_NAME
from app.goals.streak import ProgressStatus, completion_dates, period_results
from app.habits import service as habits_service
from app.habits.exceptions import HabitForbiddenError, HabitNotFoundError
from app.habits.models import Habit, HabitStatus
from app.statistics import repository as statistics_repository
from app.statistics.calculations import (
  build_calendar_days,
  calculate_activity_streak,
  days_window,
  fill_series,
  month_bounds,
  to_completion_rate,
  window_starts,
)
from app.statistics.schemas import (
  ActivityStreak,
  AtRiskSummary,
  CalendarQuery,
  CheckInsSummary,
  CompletedHabitsSummary,
  CompletionRate,
  GoalCompletion,
  HabitCalendar,
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


def get_habit_calendar(
  db: Session, habit_id: UUID, user: User, query: CalendarQuery
) -> HabitCalendar:
  """Devolve o calendário mensal de um hábito do usuário logado."""
  try:
    habit = habits_service.get_owned_habit(db, habit_id, user)
  except HabitForbiddenError:
    raise HabitNotFoundError from None

  if habit.goal is None:
    raise GoalNotFoundError

  today = habits_service.today()
  month_start, month_end = month_bounds(query.month, today)

  days_by_habit = goals_repository.list_check_in_days(db, [habit.id])
  days = days_by_habit.get(habit.id, set())

  calendar_days = build_calendar_days(
    goal=habit.goal,
    days=days,
    month_start=month_start,
    month_end=month_end,
    today=today,
    finished_at=habit.finished_at,
  )

  month_str = f"{month_start.year:04d}-{month_start.month:02d}"

  return HabitCalendar(
    habit_id=habit.id,
    month=month_str,
    period=habit.goal.period,
    target_count=habit.goal.target_count,
    days=calendar_days,
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
  """Painel diário: hábitos ativos com meta, do maior streak para o menor.

  Reaproveita os dias já buscados, sem consultar o banco. Empates no streak
  ficam em ordem de nome.
  """
  tracked = [
    habit
    for habit in habits
    if habit.status == HabitStatus.ACTIVE and habit.goal is not None
  ]
  progress = goals_service.build_habits_progress(tracked, days_by_habit, today)

  items = []
  for habit in tracked:
    days = days_by_habit.get(habit.id, set())
    items.append(
      HabitStatisticsItem(
        **progress[habit.id].model_dump(),
        name=habit.name,
        checked_today=today in days,
        consistency=build_consistency(habit, days, today, window_start),
      )
    )

  return sorted(items, key=lambda item: (-item.current_streak, item.name))


def build_at_risk_block(items: list[HabitStatisticsItem]) -> AtRiskSummary:
  """Hábitos sem folga, na mesma ordem de `items`. Não recalcula o progresso."""
  habit_ids = [item.habit_id for item in items if item.status == ProgressStatus.AT_RISK]

  return AtRiskSummary(count=len(habit_ids), habit_ids=habit_ids)


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
  """Hábitos que cumpriram a meta hoje, na semana e no mês. Não consulta o banco.

  Cada hábito conta uma vez por janela. Encerrados entram, até o `finished_at`.
  """
  week_start, month_start = window_starts(today, mode)
  dates_by_habit = [
    completion_dates(
      habit.goal, days_by_habit.get(habit.id, set()), today, habit.finished_at
    )
    for habit in habits
    if habit.goal is not None
  ]

  def count_since(start: date) -> int:
    return sum(any(day >= start for day in dates) for dates in dates_by_habit)

  return CompletedHabitsSummary(
    today=count_since(today),
    week=count_since(week_start),
    month=count_since(month_start),
  )


def build_goal_completion_block(
  habits: list[Habit],
  days_by_habit: dict[UUID, set[date]],
  today: date,
  window_start: date,
  days: int,
) -> GoalCompletion:
  """Taxa de períodos cumpridos de todos os hábitos com meta na janela.

  Junta os períodos antes de calcular, em vez de tirar a média das constâncias:
  assim, cada período pesa igual. Encerrados entram, até o `finished_at`. Não
  consulta o banco.
  """
  results = []
  for habit in habits:
    if habit.goal is None:
      continue
    results += period_results(
      habit.goal,
      days_by_habit.get(habit.id, set()),
      window_start,
      today,
      today,
      habit.finished_at,
    )

  return GoalCompletion(**to_completion_rate(results).model_dump(), days=days)


def build_consistency(
  habit: Habit, days: set[date], today: date, window_start: date
) -> CompletionRate:
  """Taxa de períodos cumpridos do hábito na janela. Não consulta o banco."""
  if habit.goal is None:
    return to_completion_rate([])

  results = period_results(
    habit.goal, days, window_start, today, today, habit.finished_at
  )

  return to_completion_rate(results)
