MSG_HABIT_NOT_FOUND = "Hábito não encontrado."
MSG_HABIT_FORBIDDEN = "Apenas o autor pode alterar este hábito."
MSG_GROUP_HABIT_FORBIDDEN = "Hábito de grupo só pode ser alterado pelas rotas do grupo."
MSG_HABIT_FINISHED = "Hábito encerrado não aceita check-ins."
MSG_HABIT_ALREADY_FINISHED = "Hábito já encerrado."
MSG_TARGET_END_DATE_BEFORE_CREATED = (
  "A data final não pode ser anterior à data de criação do hábito."
)


class HabitNotFoundError(Exception):
  """Hábito inexistente ou que o usuário não pode ver."""


class HabitForbiddenError(Exception):
  """O usuário vê o hábito, mas não é o autor."""


class GroupHabitForbiddenError(HabitForbiddenError):
  """O usuário vê o hábito de grupo, mas ele só muda pelas rotas do grupo.

  Herda de `HabitForbiddenError`: quem já captura a mãe continua capturando esta.
  """


class HabitFinishedError(Exception):
  """Check-in recusado porque o hábito está encerrado (HAB-4)."""


class HabitAlreadyFinishedError(Exception):
  """Tentativa de encerrar um hábito que já está encerrado."""


class TargetEndDateBeforeCreatedError(Exception):
  """`target_end_date` anterior ao `created_at` gravado do hábito."""
