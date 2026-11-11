MSG_GROUP_NOT_FOUND = "Grupo não encontrado."
MSG_GROUP_FORBIDDEN = "Apenas administradores podem realizar esta ação."
MSG_GROUP_ENDED = "Grupo encerrado."
MSG_GROUP_FULL = "Grupo cheio."


class GroupNotFoundError(Exception):
  """Grupo inexistente ou usuário não é membro."""


class GroupForbiddenError(Exception):
  """Usuário é membro do grupo, mas não é administrador."""


class GroupEndedError(Exception):
  """Operação recusada porque o período do grupo já encerrou."""


class GroupFullError(Exception):
  """Operação recusada porque o grupo atingiu o limite de membros."""
