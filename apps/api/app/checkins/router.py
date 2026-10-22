from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins import service
from app.checkins.exceptions import (
  MSG_CHECK_IN_FORBIDDEN,
  MSG_CHECK_IN_NOT_FOUND,
  CheckInForbiddenError,
  CheckInNotFoundError,
  CheckInRefusedError,
)
from app.checkins.responses import (
  RESPONSES_CATEGORIES,
  RESPONSES_CREATE,
  RESPONSES_DELETE,
  RESPONSES_GET_BY_ID,
  RESPONSES_HABIT_CHECK_INS,
  RESPONSES_HABIT_OPTIONS,
  RESPONSES_UPDATE,
)
from app.checkins.schemas import (
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInPublic,
  CheckInUpdate,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.database import SessionDep
from app.habits.exceptions import MSG_HABIT_NOT_FOUND, HabitNotFoundError

check_ins_router = APIRouter(tags=["check-ins"])


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
  responses=RESPONSES_CREATE,
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
  responses=RESPONSES_CATEGORIES,
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
  responses=RESPONSES_HABIT_OPTIONS,
)
def get_check_in_habit_options(
  db: SessionDep,
  query: Annotated[HabitOptionsQuery, Query()],
  user: Annotated[User, Depends(get_current_user)],
) -> HabitOptionsPage:
  """Devolve uma página de hábitos elegíveis para marcar no check-in."""
  return service.list_check_in_habit_options(db, user, query)


@check_ins_router.get(
  "/check-ins/{check_in_id}",
  response_model=CheckInPublic,
  status_code=status.HTTP_200_OK,
  summary="Consultar check-in por id",
  description=(
    "Devolve o check-in se o usuário o fez ou vê algum hábito ligado a ele."
    " Quem não fez o check-in recebe só os `habit_ids` que pode ver."
  ),
  responses=RESPONSES_GET_BY_ID,
)
def get_check_in(
  db: SessionDep,
  check_in_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> CheckInPublic:
  """Consulta um check-in visível ao usuário."""
  try:
    return service.get_check_in(db, check_in_id, user)
  except CheckInNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_CHECK_IN_NOT_FOUND) from None


@check_ins_router.patch(
  "/check-ins/{check_in_id}",
  response_model=CheckInPublic,
  status_code=status.HTTP_200_OK,
  summary="Editar check-in",
  description=(
    "Altera só os campos enviados (`title`, `description`, `duration`) de um"
    " check-in de quem o fez. `description` vazia e `duration` nula apagam o"
    " valor; `title` nulo é recusado. Permitido também em hábito encerrado."
  ),
  responses=RESPONSES_UPDATE,
)
def update_check_in(
  db: SessionDep,
  check_in_id: UUID,
  data: CheckInUpdate,
  user: Annotated[User, Depends(get_current_user)],
) -> CheckInPublic:
  """Altera título, descrição ou duração de um check-in de quem o fez."""
  try:
    return service.update_check_in(db, check_in_id, user, data)
  except CheckInNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_CHECK_IN_NOT_FOUND) from None
  except CheckInForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CHECK_IN_FORBIDDEN) from None


@check_ins_router.delete(
  "/check-ins/{check_in_id}",
  status_code=status.HTTP_204_NO_CONTENT,
  summary="Excluir check-in",
  description=(
    "Exclui definitivamente o check-in de quem o fez, junto com os vínculos"
    " com os hábitos. Permitido também em hábito encerrado."
  ),
  responses=RESPONSES_DELETE,
)
def delete_check_in(
  db: SessionDep,
  check_in_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> Response:
  """Exclui um check-in de quem o fez. Responde 204, sem corpo."""
  try:
    service.delete_check_in(db, check_in_id, user)
  except CheckInNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_CHECK_IN_NOT_FOUND) from None
  except CheckInForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CHECK_IN_FORBIDDEN) from None
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@check_ins_router.get(
  "/habits/{habit_id}/check-ins",
  response_model=list[CheckInPublic],
  status_code=status.HTTP_200_OK,
  summary="Histórico de check-ins do hábito",
  description=(
    "Lista os check-ins que contam para o hábito, do mais recente ao mais"
    " antigo. Qualquer usuário que possa ver o hábito (autor ou hábito"
    " público) consulta o histórico. Quem não fez o check-in recebe só os"
    " `habit_ids` que pode ver. Hábito encerrado também lista. Sem check-ins,"
    " devolve `[]`."
  ),
  responses=RESPONSES_HABIT_CHECK_INS,
)
def list_habit_check_ins(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> list[CheckInPublic]:
  """Lista o histórico de check-ins de um hábito visível ao usuário."""
  try:
    return service.list_habit_check_ins(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
