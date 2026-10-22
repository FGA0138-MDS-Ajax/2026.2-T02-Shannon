from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins.schemas import (
  CheckInCategoriesResponse,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.checkins.service import (
  list_check_in_categories,
  list_check_in_habit_options,
)
from app.database import SessionDep

# Agrupa as rotas relacionadas aos check-ins.
check_ins_router = APIRouter(tags=["check-ins"])


# Lista as categorias que possuem hábitos ativos do usuário autenticado.
# Esta rota deve ficar antes de qualquer rota dinâmica como /check-ins/{check_in_id}.
@check_ins_router.get(
  "/check-ins/categories",
  response_model=CheckInCategoriesResponse,
  summary="Listar categorias para check-in",
  description=(
    "Retorna as categorias que possuem hábitos ativos do usuário autenticado, "
    "ordenadas alfabeticamente, com 'outros' por último. "
    "Retorna uma lista vazia quando não há hábitos elegíveis."
  ),
  responses={
    401: {"description": "Usuário não autenticado ou token inválido."},
  },
)
def get_check_in_categories(
  db: SessionDep,
  current_user: Annotated[User, Depends(get_current_user)],
) -> CheckInCategoriesResponse:
  # O serviço aplica as regras de elegibilidade e ordenação.
  return list_check_in_categories(db, current_user)


# Lista uma página de hábitos para selecionar na tela de check-in.
# O modelo de query valida os parâmetros e exige exatamente um modo de filtro.
@check_ins_router.get(
  "/check-ins/habit-options",
  response_model=HabitOptionsPage,
  summary="Listar opções de hábitos para check-in",
  description=(
    "Retorna hábitos ativos do usuário autenticado, filtrados por uma categoria "
    "ou por exclusão de categoria. A paginação aceita page >= 1 e page_size "
    "entre 1 e 20. Informe somente category ou exclude_category."
  ),
  responses={
    401: {"description": "Usuário não autenticado ou token inválido."},
    422: {
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
  },
)
def get_check_in_habit_options(
  query: Annotated[HabitOptionsQuery, Query()],
  db: SessionDep,
  current_user: Annotated[User, Depends(get_current_user)],
) -> HabitOptionsPage:
  # O serviço calcula a paginação, has_more e preselected.
  return list_check_in_habit_options(db, current_user, query)
