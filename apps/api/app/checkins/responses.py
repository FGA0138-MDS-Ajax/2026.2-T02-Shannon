from fastapi import status

from app.checkins.exceptions import (
  MSG_CHECK_IN_FORBIDDEN,
  MSG_CHECK_IN_NOT_FOUND,
)
from app.checkins.schemas import MSG_TITLE_NULL

_RESPONSE_403 = {
  "description": "Quem vê o check-in, mas não foi quem o fez.",
  "content": {"application/json": {"example": {"detail": MSG_CHECK_IN_FORBIDDEN}}},
}

_RESPONSE_404 = {
  "description": (
    "Check-in inexistente ou sem nenhum hábito ligado visível ao usuário."
  ),
  "content": {"application/json": {"example": {"detail": MSG_CHECK_IN_NOT_FOUND}}},
}

_RESPONSE_422_PATH = {
  "description": "Identificador do check-in inválido (não é um UUID).",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["path", "check_in_id"],
            "msg": "Input should be a valid UUID",
            "type": "uuid_parsing",
          }
        ]
      }
    }
  },
}

_RESPONSE_422_UPDATE = {
  "description": "Dados inválidos, como `title` nulo ou duração fora do padrão.",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["body"],
            "msg": f"Value error, {MSG_TITLE_NULL}",
            "type": "value_error",
          }
        ]
      }
    }
  },
}

RESPONSES_GET_BY_ID = {
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}

RESPONSES_UPDATE = {
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_UPDATE,
}

RESPONSES_DELETE = {
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}
