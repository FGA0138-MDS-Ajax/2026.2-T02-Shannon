# Group -----------------------------------------
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


# Members ---------------------------------------
MSG_USER_TO_ADD_NOT_FOUND = "Usuário não encontrado."
MSG_ALREADY_MEMBER = "Este usuário já participa do grupo."
MSG_ALREADY_ADMIN = "Este usuário já é administrador."
MSG_CANNOT_REMOVE_SELF = "Para sair do grupo, use a opção de sair."
MSG_MEMBER_NOT_FOUND = "Usuário não encontrado."


class UserToAddNotFoundError(Exception):
  """Usuário a ser adicionado não foi encontrado pelo username."""


class AlreadyMemberError(Exception):
  """Usuário já é membro do grupo."""


class AlreadyAdminError(Exception):
  """Membro já possui o papel de administrador."""


class CannotRemoveSelfError(Exception):
  """Administrador tentou remover a si mesmo da lista de membros."""


class MemberNotFoundError(Exception):
  """Usuário alvo não participa do grupo."""


# Invite -----------------------------------------
MSG_INVITE_CODE_INVALID = "Código de convite inválido."
MSG_ALREADY_IN_GROUP = "Você já participa deste grupo."


class InviteCodeInvalidError(Exception):
  """Código de convite inexistente ou inválido."""


class AlreadyInGroupError(Exception):
  """Usuário já participa do grupo ao tentar entrar por convite."""
