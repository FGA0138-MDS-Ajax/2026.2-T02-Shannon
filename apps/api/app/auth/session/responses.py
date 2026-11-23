from fastapi import status

from app.auth.exceptions import (
  MSG_EMAIL_TAKEN,
  MSG_NOT_AUTHENTICATED,
  MSG_TOKEN_EXPIRED,
  MSG_TOKEN_INVALID,
  MSG_USERNAME_TAKEN,
  MSG_WRONG_CURRENT_PASSWORD,
)
from app.auth.schemas import (
  MSG_PASSWORD_CONFIRMATION,
  MSG_PASSWORD_UNCHANGED,
  MSG_UPDATE_EMAIL_NEEDS_PASSWORD,
  MSG_UPDATE_NO_FIELDS,
  MSG_UPDATE_NULL_FIELD,
  PASSWORD_MAX_BYTES,
)


def _body_error(message: str) -> dict:
  """Erro de validação do corpo inteiro (`model_validator`)."""
  return {
    "detail": [
      {"loc": ["body"], "msg": f"Value error, {message}", "type": "value_error"}
    ]
  }


def _field_error(field: str, message: str, error_type: str) -> dict:
  """Erro de validação de um campo do corpo."""
  return {"detail": [{"loc": ["body", field], "msg": message, "type": error_type}]}


_RESPONSE_400_WRONG_PASSWORD = {
  "description": "Senha atual incorreta. Nada foi alterado.",
  "content": {"application/json": {"example": {"detail": MSG_WRONG_CURRENT_PASSWORD}}},
}

_RESPONSE_401 = {
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
}


RESPONSES_UPDATE_ACCOUNT = {
  status.HTTP_200_OK: {
    "description": (
      "Conta atualizada (ou nada mudou, se os valores eram os atuais). Traz o"
      " usuário com os dados novos. Os tokens continuam valendo."
    ),
  },
  status.HTTP_400_BAD_REQUEST: _RESPONSE_400_WRONG_PASSWORD,
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_409_CONFLICT: {
    "description": "Username ou e-mail já usado por outra conta. Nada foi alterado.",
    "content": {
      "application/json": {
        "examples": {
          "username_em_uso": {
            "summary": "Username de outra conta",
            "value": {"detail": MSG_USERNAME_TAKEN},
          },
          "email_em_uso": {
            "summary": "E-mail de outra conta",
            "value": {"detail": MSG_EMAIL_TAKEN},
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
          "sem_campos": {
            "summary": "Nenhum campo para alterar",
            "value": _body_error(MSG_UPDATE_NO_FIELDS),
          },
          "campo_null": {
            "summary": "Campo enviado como null",
            "value": _body_error(MSG_UPDATE_NULL_FIELD),
          },
          "email_sem_senha": {
            "summary": "E-mail sem a senha atual",
            "value": _body_error(MSG_UPDATE_EMAIL_NEEDS_PASSWORD),
          },
          "username_curto": {
            "summary": "Username com menos de 3 caracteres",
            "value": _field_error(
              "username",
              "String should have at least 3 characters",
              "string_too_short",
            ),
          },
          "username_invalido": {
            "summary": "Username com caractere fora de a-z, 0-9, _ e .",
            "value": _field_error(
              "username",
              "String should match pattern '^[a-z0-9_.]+$'",
              "string_pattern_mismatch",
            ),
          },
        }
      }
    },
  },
}


RESPONSES_CHANGE_PASSWORD = {
  status.HTTP_200_OK: {
    "description": (
      "Senha trocada. Traz um par de tokens novo, que substitui os dois guardados."
    ),
  },
  status.HTTP_400_BAD_REQUEST: _RESPONSE_400_WRONG_PASSWORD,
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
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
