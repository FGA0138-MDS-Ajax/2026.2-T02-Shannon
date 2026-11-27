from datetime import date

from app.goals.models import GoalPeriod
from app.goals.streak import PeriodResult, completion_dates, period_results
from tests.goals.unit.test_streak import Rule


def dia(mes: int, dia_do_mes: int) -> date:
  return date(2026, mes, dia_do_mes)


def outubro(*dias: int) -> list[date]:
  return [dia(10, d) for d in dias]


def resumo(results: list[PeriodResult]) -> list[tuple]:
  return [(r.start, r.end, r.done, r.target_count, r.met) for r in results]


SEMANAL_DIAS = outubro(12, 13, 15, 17, 19, 21, 23, 25, 27)


def semanal(starts_on: date) -> Rule:
  return Rule(
    GoalPeriod.WEEK, target_count=4, period_end_weekday=7, starts_on=starts_on
  )


def test_daily_goal_completion_dates_lists_each_checkin_day():
  # Meta diária: cada dia com check-in é um dia de conclusão.
  goal = Rule(GoalPeriod.DAY, starts_on=dia(10, 20))

  result = completion_dates(goal, outubro(20, 21, 22), today=dia(10, 23))

  assert result == outubro(20, 21, 22)


def test_daily_goal_period_results_skips_open_day_without_checkin():
  # O dia aberto e sem check-in não entra nos períodos da janela.
  goal = Rule(GoalPeriod.DAY, starts_on=dia(10, 20))

  result = period_results(
    goal, outubro(20, 21, 22), dia(10, 20), dia(10, 23), today=dia(10, 23)
  )

  assert resumo(result) == [
    (dia(10, 20), dia(10, 20), 1, 1, True),
    (dia(10, 21), dia(10, 21), 1, 1, True),
    (dia(10, 22), dia(10, 22), 1, 1, True),
  ]


def test_weekly_goal_completion_dates_uses_the_target_th_day():
  # A conclusão da semana é o 4º check-in do período.
  result = completion_dates(semanal(dia(10, 12)), SEMANAL_DIAS, today=dia(10, 27))

  assert result == outubro(17, 25)


def test_weekly_goal_period_results_skips_open_week_and_before_starts_on():
  # Só os dois períodos fechados e cumpridos; a semana aberta (1 de 4) fica fora.
  result = period_results(
    semanal(dia(10, 12)),
    SEMANAL_DIAS,
    dia(9, 28),
    dia(10, 27),
    today=dia(10, 27),
  )

  assert resumo(result) == [
    (dia(10, 12), dia(10, 18), 4, 4, True),
    (dia(10, 19), dia(10, 25), 4, 4, True),
  ]


def test_weekly_goal_partial_first_period_is_ignored_when_not_met():
  # O primeiro período, parcial e não cumprido, não conta nem gera conclusão.
  goal = semanal(dia(10, 14))

  completions = completion_dates(goal, SEMANAL_DIAS, today=dia(10, 27))
  results = period_results(
    goal, SEMANAL_DIAS, dia(9, 28), dia(10, 27), today=dia(10, 27)
  )

  assert completions == outubro(25)
  assert resumo(results) == [(dia(10, 19), dia(10, 25), 4, 4, True)]


def test_monthly_goal_reports_closed_months_and_skips_open_empty_month():
  # Setembro cumprido e outubro não cumprido entram; novembro vazio não.
  goal = Rule(GoalPeriod.MONTH, target_count=3, starts_on=dia(9, 1))
  days = [dia(9, 1), dia(9, 10), dia(9, 11), dia(10, 2), dia(10, 3)]

  completions = completion_dates(goal, days, today=dia(11, 15))
  results = period_results(goal, days, dia(9, 1), dia(11, 15), today=dia(11, 15))

  assert completions == [dia(9, 11)]
  assert resumo(results) == [
    (dia(9, 1), dia(9, 30), 3, 3, True),
    (dia(10, 1), dia(10, 31), 2, 3, False),
  ]


def test_finished_habit_period_results_stop_at_finished_at():
  # Hábito encerrado em 11/10: nada depois dessa data, mesmo com hoje em 20/10.
  goal = Rule(GoalPeriod.DAY, starts_on=dia(10, 1))

  result = period_results(
    goal,
    outubro(1, 2, 3, 10, 11),
    dia(10, 5),
    dia(10, 20),
    today=dia(10, 20),
    finished_at=dia(10, 11),
  )

  assert resumo(result) == [
    (dia(10, 5), dia(10, 5), 0, 1, False),
    (dia(10, 6), dia(10, 6), 0, 1, False),
    (dia(10, 7), dia(10, 7), 0, 1, False),
    (dia(10, 8), dia(10, 8), 0, 1, False),
    (dia(10, 9), dia(10, 9), 0, 1, False),
    (dia(10, 10), dia(10, 10), 1, 1, True),
    (dia(10, 11), dia(10, 11), 1, 1, True),
  ]


def test_goal_without_checkins_has_no_completions_and_unmet_closed_periods():
  # Sem check-ins: nenhuma conclusão; dias fechados viram não cumpridos.
  goal = Rule(GoalPeriod.DAY, starts_on=dia(10, 21))

  completions = completion_dates(goal, [], today=dia(10, 23))
  results = period_results(goal, [], dia(10, 21), dia(10, 23), today=dia(10, 23))

  assert completions == []
  assert resumo(results) == [
    (dia(10, 21), dia(10, 21), 0, 1, False),
    (dia(10, 22), dia(10, 22), 0, 1, False),
  ]


def test_weekly_goal_open_week_already_met_is_included():
  # Semana aberta entra quando já foi cumprida.
  goal = semanal(dia(10, 12))
  days = outubro(26, 27, 28, 29)

  completions = completion_dates(goal, days, today=dia(10, 30))
  results = period_results(goal, days, dia(10, 26), dia(11, 1), today=dia(10, 30))

  assert completions == outubro(29)
  assert resumo(results) == [(dia(10, 26), dia(11, 1), 4, 4, True)]
