import bcrypt


def hash_password(password: str) -> str:
  """Gera o hash bcrypt (formato `$2b$`) com um salt aleatório embutido."""
  return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
  """Verifica se a senha corresponde ao hash bcrypt."""
  try:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
  except (ValueError, TypeError):
    return False
