from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.habits import service
from app.habits.exceptions import MSG_HABIT_NOT_FOUND, HabitNotFoundError
from app.habits.models import HabitStatus
from app.habits.schemas import HabitCreate, HabitPublic

habit_router = APIRouter(prefix="/habits", tags=["habits"])

_RESPONSES_422_CREATE = {
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

_RESPONSES_422_LIST = {
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

_RESPONSES_GET_BY_ID = {
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


@habit_router.post(
  "",
  response_model=HabitPublic,
  status_code=status.HTTP_201_CREATED,
  summary="Criar hábito",
  description=(
    "Cria um novo hábito para o usuário logado com status ativo e data de criação hoje."
  ),
  responses=_RESPONSES_422_CREATE,
)
def create_habit(
  db: SessionDep,
  data: HabitCreate,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  """Cria um novo hábito para o usuário logado."""
  return service.create_habit(db, user, data)


@habit_router.get(
  "",
  response_model=list[HabitPublic],
  status_code=status.HTTP_200_OK,
  summary="Listar hábitos",
  description=(
    "Lista todos os hábitos do usuário logado ordenados por data de criação"
    " decrescente e nome."
  ),
  responses=_RESPONSES_422_LIST,
)
def list_habits(
  db: SessionDep,
  user: Annotated[User, Depends(get_current_user)],
  status_filter: Annotated[HabitStatus | None, Query(alias="status")] = None,
) -> list[HabitPublic]:
  """Lista os hábitos do usuário logado, com filtro opcional por status."""
  return service.list_my_habits(db, user, status_filter)


@habit_router.get(
  "/{habit_id}",
  response_model=HabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Consultar hábito por id",
  description=(
    "Consulta um hábito por id. Retorna 404 caso o hábito não exista ou seja"
    " privado de outro usuário."
  ),
  responses=_RESPONSES_GET_BY_ID,
)
def get_habit(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  """Busca um hábito pelo identificador se ele for visível ao usuário."""
  try:
    return service.get_visible_habit(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
