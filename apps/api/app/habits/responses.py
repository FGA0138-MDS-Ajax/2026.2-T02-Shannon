from fastapi import status

from app.goals.exceptions import MSG_GOAL_WEEKDAY_REQUIRED
from app.habits.exceptions import (
  MSG_HABIT_ALREADY_FINISHED,
  MSG_HABIT_FORBIDDEN,
  MSG_HABIT_NOT_FOUND,
  MSG_TARGET_END_DATE_BEFORE_CREATED,
)
from app.habits.schemas import MSG_HABIT_NAME_NULL

RESPONSES_422_CREATE = {
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Erro de validação nos dados enviados.",
    "content": {
      "application/json": {
        "examples": {
          "categoria_faltando": {
            "summary": "`category` não enviada",
            "value": {
              "detail": [
                {
                  "loc": ["body", "category"],
                  "msg": "Field required",
                  "type": "missing",
                }
              ]
            },
          },
          "meta_invalida": {
            "summary": "Regra da meta inválida (ex.: semanal sem dia de fechamento)",
            "value": {
              "detail": [
                {
                  "loc": ["body", "goal"],
                  "msg": f"Value error, {MSG_GOAL_WEEKDAY_REQUIRED}",
                  "type": "value_error",
                }
              ]
            },
          },
          "meta_faltando": {
            "summary": "`goal` não enviada",
            "value": {
              "detail": [
                {
                  "loc": ["body", "goal"],
                  "msg": "Field required",
                  "type": "missing",
                }
              ]
            },
          },
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

RESPONSES_UPDATE = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _RESPONSE_403_OWNED,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404_OWNED,
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": (
      "Dados inválidos. Erros do corpo vêm no formato do Pydantic (lista em"
      " `detail`); a data final anterior à criação vem com `detail` em texto."
    ),
    "content": {
      "application/json": {
        "examples": {
          "campo_nulo": {
            "summary": "`name`, `category` ou `is_public` enviados como null",
            "value": {
              "detail": [
                {
                  "loc": ["body"],
                  "msg": f"Value error, {MSG_HABIT_NAME_NULL}",
                  "type": "value_error",
                }
              ]
            },
          },
          "categoria_invalida": {
            "summary": "Categoria vazia ou fora da lista",
            "value": {
              "detail": [
                {
                  "loc": ["body", "category"],
                  "msg": "Input should be 'musculacao', 'corrida', ...",
                  "type": "enum",
                }
              ]
            },
          },
          "data_final_antes_da_criacao": {
            "summary": "`target_end_date` anterior ao `created_at`",
            "value": {"detail": MSG_TARGET_END_DATE_BEFORE_CREATED},
          },
        }
      }
    },
  },
}
