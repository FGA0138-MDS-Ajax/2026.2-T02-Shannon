MSG_HABIT_NOT_FOUND = "Hábito não encontrado."
MSG_HABIT_FORBIDDEN = "Apenas o autor pode alterar este hábito."
MSG_HABIT_FINISHED = "Hábito já encerrado."


class HabitNotFoundError(Exception):
  """Hábito inexistente ou que o usuário não pode ver."""


class HabitForbiddenError(Exception):
  """O usuário vê o hábito, mas não é o autor."""


class HabitFinishedError(Exception):
  """Hábito encerrado."""
