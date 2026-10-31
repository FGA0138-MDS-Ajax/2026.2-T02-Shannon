from dataclasses import dataclass
from datetime import date

import pytest

from app.goals.models import GoalPeriod
from app.goals.streak import ProgressStatus, calculate_progress, period_bounds


@dataclass
class Rule:
  period: str
  target_count: int = 1
  period_end_weekday: int | None = None
  starts_on: date = date(2026, 1, 1)


DIARIA = Rule(GoalPeriod.DAY)
SEMANAL_4X_DOMINGO = Rule(GoalPeriod.WEEK, target_count=4, period_end_weekday=7)


def outubro(*dias: int) -> list[date]:
  return [date(2026, 10, dia) for dia in dias]


# --- period_bounds (cenários 1 a 3) ---


def test_semana_que_fecha_no_domingo():
  goal = Rule(GoalPeriod.WEEK, period_end_weekday=7)

  assert period_bounds(goal, date(2026, 10, 28)) == (
    date(2026, 10, 26),
    date(2026, 11, 1),
  )


@pytest.mark.parametrize(
  ("dia", "inicio", "fim"),
  [
    (date(2026, 10, 25), date(2026, 10, 22), date(2026, 10, 28)),
    (date(2026, 10, 28), date(2026, 10, 22), date(2026, 10, 28)),
    (date(2026, 10, 29), date(2026, 10, 29), date(2026, 11, 4)),
  ],
)
def test_semana_que_fecha_na_quarta(dia, inicio, fim):
  goal = Rule(GoalPeriod.WEEK, period_end_weekday=3)

  assert period_bounds(goal, dia) == (inicio, fim)


@pytest.mark.parametrize(
  ("dia", "fim"),
  [
    (date(2027, 2, 10), date(2027, 2, 28)),
    (date(2028, 2, 10), date(2028, 2, 29)),  # ano bissexto
  ],
)
def test_mes_termina_no_ultimo_dia(dia, fim):
  goal = Rule(GoalPeriod.MONTH)

  assert period_bounds(goal, dia) == (dia.replace(day=1), fim)


# --- calculate_progress: meta diária (cenários 4 a 6) ---


def test_diaria_sem_check_in_hoje_fica_em_risco():
  progress = calculate_progress(DIARIA, outubro(20, 21, 22), date(2026, 10, 23))

  assert progress.current_streak == 3
  assert progress.status == ProgressStatus.AT_RISK
  assert progress.streak_started_on == date(2026, 10, 20)
  assert progress.consistent_days == 4


def test_diaria_com_check_in_hoje_fica_completa():
  progress = calculate_progress(DIARIA, outubro(20, 21, 22, 23), date(2026, 10, 23))

  assert progress.current_streak == 4
  assert progress.status == ProgressStatus.COMPLETED


def test_diaria_perde_o_streak_depois_de_um_dia_sem_check_in():
  progress = calculate_progress(DIARIA, outubro(20, 21, 22), date(2026, 10, 24))

  assert progress.current_streak == 0
  assert progress.streak_started_on is None
  assert progress.best_streak == 3


# --- calculate_progress: meta semanal (cenários 7 a 15) ---


def test_semanal_em_andamento_mantem_as_semanas_anteriores():
  dias = outubro(12, 13, 15, 17, 19, 21, 23, 25, 27)

  progress = calculate_progress(SEMANAL_4X_DOMINGO, dias, date(2026, 10, 27))

  assert progress.current_streak == 2
  assert progress.status == ProgressStatus.IN_PROGRESS
  assert progress.current_period.done == 1
  assert progress.streak_started_on == date(2026, 10, 12)


def test_semana_atual_cumprida_ja_conta_no_streak():
  dias = outubro(19, 21, 23, 25, 26, 27, 28, 30)

  progress = calculate_progress(SEMANAL_4X_DOMINGO, dias, date(2026, 10, 30))

  assert progress.current_streak == 2
  assert progress.status == ProgressStatus.COMPLETED


# Cenários 9 a 11: semana com 3 de 4 check-ins, virada na segunda e retomada.
DIAS_3_DE_4 = outubro(19, 21, 23, 25, 26, 27, 28)


def test_falta_um_check_in_e_sobra_o_domingo():
  progress = calculate_progress(SEMANAL_4X_DOMINGO, DIAS_3_DE_4, date(2026, 11, 1))

  assert progress.current_streak == 1
  assert progress.status == ProgressStatus.AT_RISK


def test_virada_da_semana_zera_o_streak():
  progress = calculate_progress(SEMANAL_4X_DOMINGO, DIAS_3_DE_4, date(2026, 11, 2))

  assert progress.current_streak == 0
  assert progress.streak_started_on is None
  assert progress.best_streak == 1


def test_retomada_comeca_uma_nova_constancia():
  dias = [*DIAS_3_DE_4, date(2026, 11, 3)]

  progress = calculate_progress(SEMANAL_4X_DOMINGO, dias, date(2026, 11, 3))

  assert progress.current_streak == 0
  assert progress.streak_started_on == date(2026, 11, 3)
  assert progress.consistent_days == 1


def test_varios_check_ins_no_mesmo_dia_contam_uma_vez():
  progress = calculate_progress(
    SEMANAL_4X_DOMINGO, outubro(26, 26, 26, 26), date(2026, 10, 26)
  )

  assert progress.current_period.done == 1


@pytest.mark.parametrize(
  ("dias", "hoje", "status"),
  [
    ([], date(2026, 10, 29), ProgressStatus.AT_RISK),  # faltam 4, sobram 4
    (outubro(26, 30), date(2026, 10, 30), ProgressStatus.AT_RISK),  # faltam 2, sobram 2
    (outubro(26), date(2026, 10, 31), ProgressStatus.FAILED),  # faltam 3, sobra 1
  ],
)
def test_status_pelo_que_falta_e_pelos_dias_livres(dias, hoje, status):
  progress = calculate_progress(SEMANAL_4X_DOMINGO, dias, hoje)

  assert progress.status == status


# --- calculate_progress: meta mensal e hábito encerrado (cenários 16 e 17) ---


def test_mensal_ignora_check_ins_antes_do_inicio_da_meta():
  goal = Rule(GoalPeriod.MONTH, target_count=3, starts_on=date(2026, 9, 5))
  dias = [
    date(2026, 9, 1),
    date(2026, 9, 10),
    date(2026, 9, 11),
    date(2026, 9, 12),
    *outubro(2, 3, 4),
  ]

  progress = calculate_progress(goal, dias, date(2026, 11, 15))

  assert progress.current_streak == 2
  assert progress.status == ProgressStatus.IN_PROGRESS
  assert progress.streak_started_on == date(2026, 9, 10)


def test_habito_encerrado_para_de_contar_em_finished_at():
  progress = calculate_progress(
    DIARIA,
    outubro(1, 2, 3, 10, 11),
    date(2026, 10, 20),
    finished_at=date(2026, 10, 11),
  )

  assert progress.current_streak == 2
  assert progress.best_streak == 3
  assert progress.status == ProgressStatus.ENDED
  assert progress.consistent_days == 2
