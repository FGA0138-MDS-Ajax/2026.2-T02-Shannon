from fastapi import status

from app.habits.exceptions import MSG_HABIT_NOT_FOUND

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
