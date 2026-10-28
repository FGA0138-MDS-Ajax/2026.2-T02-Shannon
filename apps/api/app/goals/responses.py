from fastapi import status

from app.goals.exceptions import MSG_GOAL_HABIT_FINISHED, MSG_GOAL_WEEK_TARGET
from app.habits.exceptions import MSG_HABIT_FORBIDDEN, MSG_HABIT_NOT_FOUND

RESPONSES_SET_GOAL = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  status.HTTP_403_FORBIDDEN: {
    "description": "Hábito público de outro usuário: só o autor altera a meta.",
    "content": {"application/json": {"example": {"detail": MSG_HABIT_FORBIDDEN}}},
  },
  status.HTTP_404_NOT_FOUND: {
    "description": "Hábito inexistente ou privado de outro usuário.",
    "content": {"application/json": {"example": {"detail": MSG_HABIT_NOT_FOUND}}},
  },
  status.HTTP_409_CONFLICT: {
    "description": "Hábito encerrado não permite alterar a meta.",
    "content": {"application/json": {"example": {"detail": MSG_GOAL_HABIT_FINISHED}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Regra da meta inválida ou identificador do hábito inválido.",
    "content": {
      "application/json": {
        "examples": {
          "regra_da_meta": {
            "summary": "Combinação de período e quantidade inválida",
            "value": {
              "detail": [
                {
                  "loc": ["body"],
                  "msg": f"Value error, {MSG_GOAL_WEEK_TARGET}",
                  "type": "value_error",
                }
              ]
            },
          },
          "id_invalido": {
            "summary": "Identificador do hábito não é um UUID",
            "value": {
              "detail": [
                {
                  "loc": ["path", "habit_id"],
                  "msg": "Input should be a valid UUID",
                  "type": "uuid_parsing",
                }
              ]
            },
          },
        }
      }
    },
  },
}
