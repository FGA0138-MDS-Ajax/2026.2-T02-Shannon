from fastapi import status

from app.group.exceptions import (
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_NOT_FOUND,
)
from app.habits.exceptions import MSG_HABIT_ALREADY_FINISHED, MSG_HABIT_NOT_FOUND
from app.habits.responses import (
  RESPONSES_422_CREATE,
  RESPONSES_422_LIST,
  RESPONSES_UPDATE,
)

GROUP_NOT_FOUND_RESPONSE = {
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo inexistente ou usuário não é membro.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_NOT_FOUND}}},
  },
}

GROUP_FORBIDDEN_RESPONSE = {
  status.HTTP_403_FORBIDDEN: {
    "description": "Apenas administradores do grupo podem realizar esta ação.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_FORBIDDEN}}},
  },
}

RESPONSES_CREATE_GROUP_HABIT = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  **GROUP_FORBIDDEN_RESPONSE,
  **GROUP_NOT_FOUND_RESPONSE,
  status.HTTP_409_CONFLICT: {
    "description": "Grupo encerrado: não aceita novos hábitos.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_ENDED}}},
  },
  **RESPONSES_422_CREATE,
}

_RESPONSE_401 = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
}

_GROUP_HABIT_NOT_FOUND_RESPONSE = {
  status.HTTP_404_NOT_FOUND: {
    "description": (
      "Grupo inexistente ou usuário não é membro; ou hábito inexistente ou de"
      " outro grupo."
    ),
    "content": {
      "application/json": {
        "examples": {
          "grupo_nao_encontrado": {
            "summary": "Grupo inexistente ou usuário não é membro",
            "value": {"detail": MSG_GROUP_NOT_FOUND},
          },
          "habito_nao_encontrado": {
            "summary": "Hábito inexistente ou de outro grupo",
            "value": {"detail": MSG_HABIT_NOT_FOUND},
          },
        }
      }
    },
  },
}

RESPONSES_LIST_GROUP_HABITS = {
  **_RESPONSE_401,
  **GROUP_NOT_FOUND_RESPONSE,
  **RESPONSES_422_LIST,
}

RESPONSES_GET_GROUP_HABIT = {
  **_RESPONSE_401,
  **_GROUP_HABIT_NOT_FOUND_RESPONSE,
}

RESPONSES_UPDATE_GROUP_HABIT = {
  **_RESPONSE_401,
  **GROUP_FORBIDDEN_RESPONSE,
  **_GROUP_HABIT_NOT_FOUND_RESPONSE,
  status.HTTP_409_CONFLICT: {
    "description": "Grupo encerrado: os hábitos não podem mais ser editados.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_ENDED}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: RESPONSES_UPDATE[
    status.HTTP_422_UNPROCESSABLE_ENTITY
  ],
}

RESPONSES_FINISH_GROUP_HABIT = {
  **_RESPONSE_401,
  **GROUP_FORBIDDEN_RESPONSE,
  **_GROUP_HABIT_NOT_FOUND_RESPONSE,
  status.HTTP_409_CONFLICT: {
    "description": "Grupo encerrado ou hábito já encerrado.",
    "content": {
      "application/json": {
        "examples": {
          "grupo_encerrado": {
            "summary": "Grupo encerrado",
            "value": {"detail": MSG_GROUP_ENDED},
          },
          "habito_ja_encerrado": {
            "summary": "Hábito já encerrado",
            "value": {"detail": MSG_HABIT_ALREADY_FINISHED},
          },
        }
      }
    },
  },
}
