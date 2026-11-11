from fastapi import status

from app.group.exceptions import MSG_GROUP_FORBIDDEN, MSG_GROUP_NOT_FOUND
from app.group.schemas import MSG_ENDS_ON_BEFORE_STARTS_ON

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

RESPONSES_CREATE_GROUP = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Dados do grupo inválidos.",
    "content": {
      "application/json": {
        "examples": {
          "periodo_invalido": {
            "summary": "Data final anterior à data inicial ou anterior a hoje",
            "value": {
              "detail": [
                {
                  "loc": ["body", "ends_on"],
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
                  "msg": ("Input should be 'check_ins' or 'goals'"),
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
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
}

RESPONSES_GET_GROUP = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo inexistente ou usuário não é membro.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_NOT_FOUND}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
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

RESPONSES_CREATE_GROUP = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Dados do grupo inválidos.",
    "content": {
      "application/json": {
        "examples": {
          "periodo_invalido": {
            "summary": "Data final anterior à data inicial ou anterior a hoje",
            "value": {
              "detail": [
                {
                  "loc": ["body", "ends_on"],
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
                  "msg": (
                    "Input should be 'check_ins' or 'goals'"
                  ),
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
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
}

RESPONSES_GET_GROUP = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  },
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo inexistente ou usuário não é membro.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_NOT_FOUND}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
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
