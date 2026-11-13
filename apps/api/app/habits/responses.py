from fastapi import status

from app.goals.exceptions import MSG_GOAL_WEEKDAY_REQUIRED
from app.habits.exceptions import (
  MSG_GROUP_HABIT_FORBIDDEN,
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

_GOAL_DAY = {
  "schedule_type": "frequency",
  "period": "day",
  "target_count": 1,
  "period_end_weekday": None,
  "starts_on": "2026-11-01",
}

_PROGRESS_DAY = {
  "habit_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "goal": _GOAL_DAY,
  "current_period": {
    "start": "2026-11-11",
    "end": "2026-11-11",
    "done": 0,
    "target_count": 1,
  },
  "status": "at_risk",
  "current_streak": 2,
  "best_streak": 2,
  "streak_started_on": "2026-11-09",
  "consistent_days": 3,
}

_EXAMPLE_PERSONAL_HABIT = {
  "id": "3b241101-e2bb-4255-8caf-4136c566a962",
  "name": "Ler 20 minutos",
  "description": None,
  "category": "outros",
  "is_public": False,
  "status": "active",
  "author_user_id": "9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f",
  "author_group_id": None,
  "created_at": "2026-11-01",
  "target_end_date": None,
  "finished_at": None,
  "goal": _GOAL_DAY,
  "group": None,
}

_EXAMPLE_GROUP_HABIT = {
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Correr 5 km",
  "description": None,
  "category": "corrida",
  "is_public": False,
  "status": "active",
  "author_user_id": None,
  "author_group_id": "a3bb189e-8bf9-3888-9912-ace4e6543002",
  "created_at": "2026-11-01",
  "target_end_date": None,
  "finished_at": None,
  "goal": _GOAL_DAY,
  "group": {"id": "a3bb189e-8bf9-3888-9912-ace4e6543002", "name": "Corredores da FGA"},
}

RESPONSES_LIST = {
  status.HTTP_200_OK: {
    "description": (
      "Hábitos do usuário e dos grupos de que ele é membro, do mais recente ao"
      " mais antigo. Em hábito de grupo, `group` vem preenchido, `author_user_id`"
      " é nulo e `progress` é o do próprio usuário (a partir da entrada dele no"
      " grupo). Em hábito pessoal, `group` é `null`. O filtro `status` vale para"
      " os dois tipos. Hábito de grupo não pode ser editado, encerrado nem"
      " excluído por estas rotas."
    ),
    "content": {
      "application/json": {
        "example": [
          {**_EXAMPLE_GROUP_HABIT, "progress": _PROGRESS_DAY},
          {
            **_EXAMPLE_PERSONAL_HABIT,
            "progress": {
              **_PROGRESS_DAY,
              "habit_id": _EXAMPLE_PERSONAL_HABIT["id"],
            },
          },
        ]
      }
    },
  },
  **RESPONSES_422_LIST,
}

RESPONSES_GET_BY_ID = {
  status.HTTP_200_OK: {
    "description": (
      "Hábito visível ao usuário. Em hábito de grupo (só para membros), `group`"
      " vem preenchido e `author_user_id` é nulo; em hábito pessoal, `group` é"
      " `null`."
    ),
    "content": {
      "application/json": {
        "examples": {
          "habito_pessoal": {
            "summary": "Hábito pessoal",
            "value": _EXAMPLE_PERSONAL_HABIT,
          },
          "habito_de_grupo": {
            "summary": "Hábito de grupo, visto por um membro",
            "value": _EXAMPLE_GROUP_HABIT,
          },
        }
      }
    },
  },
  status.HTTP_404_NOT_FOUND: {
    "description": (
      "Hábito não encontrado, privado de outro usuário ou de um grupo de que o"
      " usuário não participa (inclui quem saiu do grupo)."
    ),
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
  "description": (
    "O usuário vê o hábito, mas não pode alterá-lo: hábito público de outro"
    " usuário (só o autor altera) ou hábito de grupo (só pelas rotas do grupo)."
  ),
  "content": {
    "application/json": {
      "examples": {
        "habito_publico_de_outro": {
          "summary": "Hábito público de outro usuário",
          "value": {"detail": MSG_HABIT_FORBIDDEN},
        },
        "habito_de_grupo": {
          "summary": "Hábito de grupo (membro ou administrador)",
          "value": {"detail": MSG_GROUP_HABIT_FORBIDDEN},
        },
      }
    }
  },
}

_RESPONSE_404_OWNED = {
  "description": (
    "Hábito inexistente, privado de outro usuário ou de um grupo de que o"
    " usuário não participa."
  ),
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
