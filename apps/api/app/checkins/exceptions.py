from uuid import UUID

MSG_CHECK_IN_NOT_FOUND = "Check-in não encontrado."
MSG_CHECK_IN_FORBIDDEN = "Apenas quem fez o check-in pode alterá-lo."
MSG_CHECK_IN_HABIT_FORBIDDEN = "Apenas o autor pode fazer check-in neste hábito."


class CheckInNotFoundError(Exception):
  """Check-in inexistente ou que o usuário não pode ver."""


class CheckInForbiddenError(Exception):
  """O usuário vê o check-in, mas não foi ele quem o fez."""


class CheckInRefusedError(Exception):
  """Algum hábito da lista não aceita este check-in. Nada foi gravado."""

  def __init__(self, status_code: int, message: str, habit_ids: list[UUID]) -> None:
    super().__init__(message)
    self.status_code = status_code
    self.message = message
    self.habit_ids = habit_ids
