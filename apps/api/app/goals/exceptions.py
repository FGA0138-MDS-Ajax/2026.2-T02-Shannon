MSG_GOAL_DAY_TARGET = "A meta diária deve ser de 1 vez por dia."
MSG_GOAL_WEEK_TARGET = "A meta semanal deve ter de 1 a 7 vezes."
MSG_GOAL_WEEKDAY_REQUIRED = (
  "Informe o dia de fechamento da semana (1 = segunda ... 7 = domingo)."
)
MSG_GOAL_MONTH_TARGET = "A meta mensal deve ter de 1 a 28 vezes."
MSG_GOAL_WEEKDAY_NOT_ALLOWED = "Só a meta semanal tem dia de fechamento."
MSG_GOAL_NOT_FOUND = "Este hábito ainda não tem meta."
MSG_GOAL_HABIT_FINISHED = "Hábito encerrado não permite alterar a meta."


class GoalNotFoundError(Exception):
  """O hábito existe, mas não tem meta (criado antes desta sprint)."""


class GoalHabitFinishedError(Exception):
  """Tentativa de alterar a meta de um hábito encerrado."""
