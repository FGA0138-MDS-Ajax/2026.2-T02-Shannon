from fastapi import status

from app.auth.exceptions import (
  MSG_NOT_AUTHENTICATED,
  MSG_TOKEN_EXPIRED,
  MSG_TOKEN_INVALID,
  MSG_WRONG_CURRENT_PASSWORD,
)
from app.auth.schemas import (
  MSG_PASSWORD_CONFIRMATION,
  MSG_PASSWORD_UNCHANGED,
  PASSWORD_MAX_BYTES,
)


def _body_error(message: str) -> dict:
  """Erro de validação do corpo inteiro (`model_validator`)."""
  return {
    "detail": [
      {"loc": ["body"], "msg": f"Value error, {message}", "type": "value_error"}
    ]
  }


RESPONSES_CHANGE_PASSWORD = {
  status.HTTP_200_OK: {
    "description": (
      "Senha trocada. Traz um par de tokens novo, que substitui os dois guardados."
    ),
  },
  status.HTTP_400_BAD_REQUEST: {
    "description": "Senha atual incorreta. Nada foi alterado.",
    "content": {
      "application/json": {"example": {"detail": MSG_WRONG_CURRENT_PASSWORD}}
    },
  },
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Access token ausente, expirado ou inválido.",
    "content": {
      "application/json": {
        "examples": {
          "sem_token": {
            "summary": "Sem token",
            "value": {"detail": MSG_NOT_AUTHENTICATED},
          },
          "token_expirado": {
            "summary": "Token expirado",
            "value": {"detail": MSG_TOKEN_EXPIRED},
          },
          "token_invalido": {
            "summary": "Token inválido",
            "value": {"detail": MSG_TOKEN_INVALID},
          },
        }
      }
    },
  },
  status.HTTP_422_UNPROCESSABLE_CONTENT: {
    "description": "Dados inválidos. Nada foi alterado.",
    "content": {
      "application/json": {
        "examples": {
          "confirmacao_diferente": {
            "summary": "Confirmação diferente da nova senha",
            "value": _body_error(MSG_PASSWORD_CONFIRMATION),
          },
          "nova_igual_atual": {
            "summary": "Nova senha igual à atual",
            "value": _body_error(MSG_PASSWORD_UNCHANGED),
          },
          "nova_curta": {
            "summary": "Nova senha com menos de 8 caracteres",
            "value": {
              "detail": [
                {
                  "loc": ["body", "new_password"],
                  "msg": "String should have at least 8 characters",
                  "type": "string_too_short",
                }
              ]
            },
          },
          "nova_longa": {
            "summary": f"Nova senha com mais de {PASSWORD_MAX_BYTES} bytes",
            "value": {
              "detail": [
                {
                  "loc": ["body", "new_password"],
                  "msg": (
                    "Value error, A senha deve ter no máximo"
                    f" {PASSWORD_MAX_BYTES} bytes."
                  ),
                  "type": "value_error",
                }
              ]
            },
          },
        }
      }
    },
  },
}
