from fastapi import HTTPException, status


MSG_NOT_AUTHENTICATED = "Não autenticado."
MSG_TOKEN_EXPIRED = "Token expirado."
MSG_TOKEN_INVALID = "Token inválido."


def unauthorized_exception(message: str) -> HTTPException:
  """Padroniza as RESPONSE's 401 para validação de usuário"""
  exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail=message,
    headers={"WWW-Authenticate": "Bearer"},
  )
  return exception
