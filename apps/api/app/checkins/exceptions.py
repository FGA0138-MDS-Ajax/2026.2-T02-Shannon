MSG_CHECK_IN_NOT_FOUND = "Check-in não encontrado."
MSG_CHECK_IN_FORBIDDEN = "Apenas quem fez o check-in pode alterá-lo."


class CheckInNotFoundError(Exception):
  """Check-in inexistente ou que o usuário não pode ver."""


class CheckInForbiddenError(Exception):
  """O usuário vê o check-in, mas não foi ele quem o fez."""
