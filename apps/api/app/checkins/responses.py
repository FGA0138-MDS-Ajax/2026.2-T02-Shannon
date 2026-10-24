from fastapi import status

from app.checkins.exceptions import (
  MSG_CHECK_IN_FORBIDDEN,
  MSG_CHECK_IN_HABIT_FORBIDDEN,
  MSG_CHECK_IN_NOT_FOUND,
)
from app.checkins.schemas import (
  MSG_DUPLICATE_HABIT_IDS,
  MSG_ONE_FILTER_MODE,
  MSG_TITLE_NULL,
)
from app.habits.exceptions import MSG_HABIT_FINISHED, MSG_HABIT_NOT_FOUND

_EXAMPLE_HABIT_ID = "a3c9b6e2-4f1d-4c8a-9b7e-2d5f8a1c3e60"

_RESPONSE_401 = {
  "description": "Usuário não autenticado ou token inválido.",
}

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

_RESPONSE_422_CREATE = {
  "description": "Erro de validação nos dados enviados.",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["body", "habit_ids"],
            "msg": f"Value error, {MSG_DUPLICATE_HABIT_IDS}",
            "type": "value_error",
          }
        ]
      }
    }
  },
}

_RESPONSE_422_HABIT_OPTIONS = {
  "description": "Parâmetros inválidos ou modos de filtro incompatíveis.",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["query"],
            "msg": f"Value error, {MSG_ONE_FILTER_MODE}",
            "type": "value_error",
          }
        ]
      }
    }
  },
}


def _refusal_response(description: str, message: str) -> dict:
  """Documenta uma recusa do `POST /check-ins` no formato `{"detail", "habit_ids"}`."""
  return {
    "description": description,
    "content": {
      "application/json": {
        "example": {"detail": message, "habit_ids": [_EXAMPLE_HABIT_ID]}
      }
    },
  }


RESPONSES_CREATE = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _refusal_response(
    "Hábito público de outro usuário.", MSG_CHECK_IN_HABIT_FORBIDDEN
  ),
  status.HTTP_404_NOT_FOUND: _refusal_response(
    "Hábito inexistente ou privado de outro usuário.", MSG_HABIT_NOT_FOUND
  ),
  status.HTTP_409_CONFLICT: _refusal_response(
    "Hábito do usuário já encerrado.", MSG_HABIT_FINISHED
  ),
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_CREATE,
}

RESPONSES_CATEGORIES = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
}

RESPONSES_HABIT_OPTIONS = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_HABIT_OPTIONS,
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

RESPONSES_HABIT_CHECK_INS = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_404_NOT_FOUND: {
    "description": "Hábito inexistente ou privado de outro usuário.",
    "content": {"application/json": {"example": {"detail": MSG_HABIT_NOT_FOUND}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Identificador do hábito inválido (não é um UUID).",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "loc": ["path", "habit_id"],
              "msg": "Input should be a valid UUID",
              "type": "uuid_parsing",
            }
          ]
        }
      }
    },
  },
}
