from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins import service
from app.checkins.exceptions import MSG_CHECK_IN_HABIT_FORBIDDEN, CheckInRefusedError
from app.checkins.schemas import (
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInPublic,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.database import SessionDep
from app.habits.exceptions import MSG_HABIT_FINISHED, MSG_HABIT_NOT_FOUND

check_ins_router = APIRouter(tags=["check-ins"])

_RESPONSES_401 = {
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
  }
}

_RESPONSES_HABIT_OPTIONS = {
  **_RESPONSES_401,
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Parâmetros inválidos ou modos de filtro incompatíveis.",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "type": "value_error",
              "loc": ["query"],
              "msg": "Informe category ou exclude_category, apenas um.",
              "input": {},
            }
          ]
        }
      }
    },
  },
}

_EXAMPLE_HABIT_ID = "a3c9b6e2-4f1d-4c8a-9b7e-2d5f8a1c3e60"


def _refusal_response(description: str, message: str) -> dict:
  """Documenta uma recusa no formato `{"detail", "habit_ids"}`."""
  return {
    "description": description,
    "content": {
      "application/json": {
        "example": {"detail": message, "habit_ids": [_EXAMPLE_HABIT_ID]}
      }
    },
  }


_RESPONSES_CREATE = {
  **_RESPONSES_401,
  status.HTTP_404_NOT_FOUND: _refusal_response(
    "Hábito inexistente ou privado de outro usuário.", MSG_HABIT_NOT_FOUND
  ),
  status.HTTP_403_FORBIDDEN: _refusal_response(
    "Hábito público de outro usuário.", MSG_CHECK_IN_HABIT_FORBIDDEN
  ),
  status.HTTP_409_CONFLICT: _refusal_response(
    "Hábito do usuário já encerrado.", MSG_HABIT_FINISHED
  ),
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Erro de validação nos dados enviados.",
    "content": {
      "application/json": {
        "example": {
          "detail": [
            {
              "type": "value_error",
              "loc": ["body", "habit_ids"],
              "msg": "Value error, A lista de hábitos não pode ter itens repetidos.",
              "input": [_EXAMPLE_HABIT_ID, _EXAMPLE_HABIT_ID],
            }
          ]
        }
      }
    },
  },
}


@check_ins_router.post(
  "/check-ins",
  response_model=CheckInPublic,
  status_code=status.HTTP_201_CREATED,
  summary="Registrar check-in",
  description=(
    "Registra um check-in que conta para vários hábitos (de 1 a 20, sem repetidos)."
    " Todos precisam ser hábitos ativos do usuário logado. Se algum for recusado,"
    " nada é gravado e o erro traz `detail` e os `habit_ids` do motivo mais grave"
    " (404, depois 403, depois 409)."
  ),
  responses=_RESPONSES_CREATE,
)
def create_check_in(
  db: SessionDep,
  data: CheckInCreate,
  user: Annotated[User, Depends(get_current_user)],
) -> CheckInPublic | JSONResponse:
  """Registra o check-in ou devolve a recusa com os ids do motivo."""
  try:
    return service.register_check_in(db, user, data)
  except CheckInRefusedError as exc:
    return JSONResponse(
      status_code=exc.status_code,
      content={"detail": exc.message, "habit_ids": [str(i) for i in exc.habit_ids]},
    )


# As rotas fixas abaixo precisam ficar antes de `/check-ins/{check_in_id}` (HAB-5).
@check_ins_router.get(
  "/check-ins/categories",
  response_model=CheckInCategoriesResponse,
  status_code=status.HTTP_200_OK,
  summary="Listar categorias para check-in",
  description=(
    "Retorna as categorias com hábitos ativos do usuário logado, em ordem"
    " alfabética e com 'outros' por último. Lista vazia se não houver hábitos."
  ),
  responses=_RESPONSES_401,
)
def get_check_in_categories(
  db: SessionDep,
  user: Annotated[User, Depends(get_current_user)],
) -> CheckInCategoriesResponse:
  """Conta os hábitos elegíveis do usuário por categoria."""
  return service.list_check_in_categories(db, user)


@check_ins_router.get(
  "/check-ins/habit-options",
  response_model=HabitOptionsPage,
  status_code=status.HTTP_200_OK,
  summary="Listar opções de hábitos para check-in",
  description=(
    "Retorna hábitos ativos do usuário logado de uma categoria (`category`) ou"
    " das demais (`exclude_category`), informando só um dos dois. Paginação com"
    " `page` >= 1 e `page_size` de 1 a 20."
  ),
  responses=_RESPONSES_HABIT_OPTIONS,
)
def get_check_in_habit_options(
  db: SessionDep,
  query: Annotated[HabitOptionsQuery, Query()],
  user: Annotated[User, Depends(get_current_user)],
) -> HabitOptionsPage:
  """Devolve uma página de hábitos elegíveis para marcar no check-in."""
  return service.list_check_in_habit_options(db, user, query)
