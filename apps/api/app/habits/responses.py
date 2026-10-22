from fastapi import status

from app.habits.exceptions import (
  MSG_HABIT_ALREADY_FINISHED,
  MSG_HABIT_FORBIDDEN,
  MSG_HABIT_NOT_FOUND,
)

RESPONSES_422_CREATE = {
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Erro de validação nos dados enviados.",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "loc": ["body", "category"],
              "msg": "Field required",
              "type": "missing",
            }
          ]
        }
      }
    },
  }
}

RESPONSES_422_LIST = {
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Parâmetro de consulta com valor inválido.",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "loc": ["query", "status"],
              "msg": "Input should be 'active' or 'finished'",
              "type": "enum",
            }
          ]
        }
      }
    },
  }
}

RESPONSES_GET_BY_ID = {
  status.HTTP_404_NOT_FOUND: {
    "description": "Hábito não encontrado ou privado de outro usuário.",
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

_RESPONSE_401 = {
  "description": "Usuário não autenticado ou token inválido.",
}

_RESPONSE_403_OWNED = {
  "description": "Hábito público de outro usuário: só o autor pode alterar.",
  "content": {"application/json": {"example": {"detail": MSG_HABIT_FORBIDDEN}}},
}

_RESPONSE_404_OWNED = {
  "description": "Hábito inexistente ou privado de outro usuário.",
  "content": {"application/json": {"example": {"detail": MSG_HABIT_NOT_FOUND}}},
}

_RESPONSE_422_PATH = {
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
}

RESPONSES_FINISH = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _RESPONSE_403_OWNED,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404_OWNED,
  status.HTTP_409_CONFLICT: {
    "description": "O hábito já está encerrado.",
    "content": {
      "application/json": {"example": {"detail": MSG_HABIT_ALREADY_FINISHED}}
    },
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}

RESPONSES_DELETE = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _RESPONSE_403_OWNED,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404_OWNED,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}
