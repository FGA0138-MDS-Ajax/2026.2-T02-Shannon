from fastapi import status

from app.group.exceptions import (
  MSG_ALREADY_ADMIN,
  MSG_ALREADY_MEMBER,
  MSG_CANNOT_REMOVE_SELF,
  MSG_GROUP_ENDED,
  MSG_GROUP_FORBIDDEN,
  MSG_GROUP_FULL,
  MSG_GROUP_NOT_FOUND,
  MSG_MEMBER_NOT_FOUND,
  MSG_USER_TO_ADD_NOT_FOUND,
)
from app.group.schemas import MSG_ENDS_ON_BEFORE_STARTS_ON
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

_EXAMPLE_GROUP_ID = "c8e1d9b4-2a7f-4d6e-9c12-3f8a5b7e0d21"
_EXAMPLE_USER_ID = "a3c9b6e2-4f1d-4c8a-9b7e-2d5f8a1c3e60"

EXAMPLE_GROUP_DETAIL = {
  "id": _EXAMPLE_GROUP_ID,
  "name": "Corrida Matinal",
  "description": "Grupo para manter a constância de corrida na semana.",
  "starts_on": "2026-11-11",
  "ends_on": "2026-12-11",
  "ranking_criterion": "check_ins",
  "status": "active",
  "members_count": 1,
  "my_role": "admin",
  "invite_code": "K7P4M9X2",
  "members": [
    {
      "user_id": _EXAMPLE_USER_ID,
      "username": "pedro_melo",
      "role": "admin",
      "joined_at": "2026-11-11T12:00:00Z",
    }
  ],
}

EXAMPLE_GROUP_LIST_ITEM = {
  "id": _EXAMPLE_GROUP_ID,
  "name": "Corrida Matinal",
  "members_count": 4,
  "my_role": "admin",
  "status": "active",
  "ends_on": "2026-12-11",
  "ranking_criterion": "check_ins",
}

_RESPONSE_401 = {
  "description": "Usuário não autenticado ou token inválido.",
}

RESPONSES_CREATE_GROUP = {
  status.HTTP_201_CREATED: {
    "description": "Grupo criado com sucesso.",
    "content": {"application/json": {"example": EXAMPLE_GROUP_DETAIL}},
  },
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_422_UNPROCESSABLE_CONTENT: {
    "description": (
      "Dados do grupo inválidos. Erros de validação do corpo vêm no formato do"
      " Pydantic; `ends_on` anterior a hoje ou ao início padrão vem com `detail`"
      " em texto."
    ),
    "content": {
      "application/json": {
        "examples": {
          "periodo_invalido": {
            "summary": "Data final anterior à data inicial",
            "value": {
              "detail": [
                {
                  "loc": ["body"],
                  "msg": f"Value error, {MSG_ENDS_ON_BEFORE_STARTS_ON}",
                  "type": "value_error",
                }
              ]
            },
          },
          "criterio_invalido": {
            "summary": "Critério de ranking inexistente",
            "value": {
              "detail": [
                {
                  "loc": ["body", "ranking_criterion"],
                  "msg": "Input should be 'check_ins' or 'goals'",
                  "type": "enum",
                }
              ]
            },
          },
        }
      }
    },
  },
}

RESPONSES_LIST_GROUPS = {
  status.HTTP_200_OK: {
    "description": "Lista de grupos do usuário autenticado (ativos primeiro).",
    "content": {"application/json": {"example": [EXAMPLE_GROUP_LIST_ITEM]}},
  },
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
}

RESPONSES_GET_GROUP = {
  status.HTTP_200_OK: {
    "description": "Detalhes do grupo e lista de membros.",
    "content": {"application/json": {"example": EXAMPLE_GROUP_DETAIL}},
  },
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  **GROUP_NOT_FOUND_RESPONSE,
  status.HTTP_422_UNPROCESSABLE_CONTENT: {
    "description": "Identificador do grupo inválido (não é um UUID).",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "loc": ["path", "group_id"],
              "msg": "Input should be a valid UUID",
              "type": "uuid_parsing",
            }
          ]
        }
      }
    },
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
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  **GROUP_NOT_FOUND_RESPONSE,
  **RESPONSES_422_LIST,
}

RESPONSES_GET_GROUP_HABIT = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  **_GROUP_HABIT_NOT_FOUND_RESPONSE,
}

RESPONSES_UPDATE_GROUP_HABIT = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
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
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
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

RESPONSES_ADD_MEMBER = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: GROUP_FORBIDDEN_RESPONSE[status.HTTP_403_FORBIDDEN],
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo inexistente ou usuário não encontrado.",
    "content": {
      "application/json": {
        "examples": {
          "grupo_nao_encontrado": {
            "summary": "Grupo não encontrado",
            "value": {"detail": MSG_GROUP_NOT_FOUND},
          },
          "usuario_nao_encontrado": {
            "summary": "Usuário a ser adicionado não existe",
            "value": {"detail": MSG_USER_TO_ADD_NOT_FOUND},
          },
        }
      }
    },
  },
  status.HTTP_409_CONFLICT: {
    "description": "Conflito ao adicionar integrante.",
    "content": {
      "application/json": {
        "examples": {
          "ja_membro": {
            "summary": "Usuário já participa do grupo",
            "value": {"detail": MSG_ALREADY_MEMBER},
          },
          "grupo_encerrado": {
            "summary": "Grupo já encerrado",
            "value": {"detail": MSG_GROUP_ENDED},
          },
          "grupo_cheio": {
            "summary": "Grupo já atingiu o limite de membros",
            "value": {"detail": MSG_GROUP_FULL},
          },
        }
      }
    },
  },
}

RESPONSES_LIST_MEMBERS = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_404_NOT_FOUND: GROUP_NOT_FOUND_RESPONSE[status.HTTP_404_NOT_FOUND],
}

RESPONSES_DELETE_MEMBER = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: GROUP_FORBIDDEN_RESPONSE[status.HTTP_403_FORBIDDEN],
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo ou integrante não encontrado.",
    "content": {
      "application/json": {
        "examples": {
          "grupo_nao_encontrado": {
            "summary": "Grupo não encontrado",
            "value": {"detail": MSG_GROUP_NOT_FOUND},
          },
          "membro_nao_encontrado": {
            "summary": "Usuário alvo não é membro",
            "value": {"detail": MSG_MEMBER_NOT_FOUND},
          },
        }
      }
    },
  },
  status.HTTP_409_CONFLICT: {
    "description": "Tentativa de remover a si mesmo.",
    "content": {"application/json": {"example": {"detail": MSG_CANNOT_REMOVE_SELF}}},
  },
}

RESPONSES_PROMOTE_MEMBER = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: GROUP_FORBIDDEN_RESPONSE[status.HTTP_403_FORBIDDEN],
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo ou integrante não encontrado.",
    "content": {
      "application/json": {
        "examples": {
          "grupo_nao_encontrado": {
            "summary": "Grupo não encontrado",
            "value": {"detail": MSG_GROUP_NOT_FOUND},
          },
          "membro_nao_encontrado": {
            "summary": "Usuário alvo não é membro",
            "value": {"detail": MSG_MEMBER_NOT_FOUND},
          },
        }
      }
    },
  },
  status.HTTP_409_CONFLICT: {
    "description": "Integrante já é administrador.",
    "content": {"application/json": {"example": {"detail": MSG_ALREADY_ADMIN}}},
  },
}

RESPONSES_LEAVE_GROUP = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_404_NOT_FOUND: GROUP_NOT_FOUND_RESPONSE[status.HTTP_404_NOT_FOUND],
}
