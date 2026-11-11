import secrets

INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 8


def generate_invite_code() -> str:
  """Gera um código de convite seguro de 8 caracteres sem caracteres ambíguos."""
  return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))
