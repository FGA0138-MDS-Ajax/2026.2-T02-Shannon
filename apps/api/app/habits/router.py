from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.goals import service as goals_service
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.habits import service
from app.habits.exceptions import (
  MSG_HABIT_ALREADY_FINISHED,
  MSG_HABIT_FORBIDDEN,
  MSG_HABIT_NOT_FOUND,
  MSG_TARGET_END_DATE_BEFORE_CREATED,
  HabitAlreadyFinishedError,
  HabitForbiddenError,
  HabitNotFoundError,
  TargetEndDateBeforeCreatedError,
)
from app.habits.models import HabitStatus
from app.habits.responses import (
  RESPONSES_422_CREATE,
  RESPONSES_422_LIST,
  RESPONSES_DELETE,
  RESPONSES_FINISH,
  RESPONSES_GET_BY_ID,
  RESPONSES_UPDATE,
)
from app.habits.schemas import (
  HabitCreate,
  HabitPublic,
  HabitUpdate,
  HabitWithProgress,
)


habit_router = APIRouter(prefix="/habits", tags=["habits"])


@habit_router.post(
  "",
  response_model=HabitPublic,
  status_code=status.HTTP_201_CREATED,
  summary="Criar hábito",
  description=(
    "Cria um novo hábito para o usuário logado com status ativo e data de criação hoje."
  ),
  responses=RESPONSES_422_CREATE,
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
  response_model=list[HabitWithProgress],
  status_code=status.HTTP_200_OK,
  summary="Listar hábitos",
  description=(
    "Lista todos os hábitos do usuário logado ordenados por data de criação"
    " decrescente e nome."
  ),
  responses=RESPONSES_422_LIST,
)
def list_habits(
  db: SessionDep,
  user: Annotated[User, Depends(get_current_user)],
  status_filter: Annotated[HabitStatus | None, Query(alias="status")] = None,
) -> list[HabitWithProgress]:
  """Lista os hábitos do usuário logado, com filtro opcional por status."""
  return goals_service.list_habits_with_progress(db, user, status_filter)


@habit_router.get(
  "/{habit_id}",
  response_model=HabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Consultar hábito por id",
  description=(
    "Consulta um hábito por id. Retorna 404 caso o hábito não exista ou seja"
    " privado de outro usuário."
  ),
  responses=RESPONSES_GET_BY_ID,
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


@habit_router.post(
  "/{habit_id}/finish",
  response_model=HabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Encerrar hábito",
  description=(
    "Encerra um hábito do usuário logado: `status` passa a `finished` e"
    " `finished_at` recebe a data de hoje. Não tem corpo. Só o autor pode"
    " encerrar."
  ),
  responses=RESPONSES_FINISH,
)
def finish_habit(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  """Encerra o hábito do autor."""
  try:
    return service.finish_habit(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except HabitForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_HABIT_FORBIDDEN) from None
  except HabitAlreadyFinishedError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_HABIT_ALREADY_FINISHED) from None


@habit_router.delete(
  "/{habit_id}",
  status_code=status.HTTP_204_NO_CONTENT,
  summary="Excluir hábito",
  description=(
    "Exclui definitivamente um hábito do usuário logado. Os check-ins"
    " continuam existindo; só os vínculos com este hábito são apagados."
    " Responde 204, sem corpo."
  ),
  responses=RESPONSES_DELETE,
)
def delete_habit(
  db: SessionDep,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> Response:
  """Exclui o hábito do autor. Responde 204, sem corpo."""
  try:
    service.delete_habit(db, habit_id, user)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except HabitForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_HABIT_FORBIDDEN) from None
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@habit_router.patch(
  "/{habit_id}",
  response_model=HabitPublic,
  status_code=status.HTTP_200_OK,
  summary="Editar hábito",
  description=(
    "Edita um hábito do usuário logado. Só os campos enviados mudam; `{}` não"
    " altera nada. `name`, `category` e `is_public` não aceitam `null`;"
    " `description` e `target_end_date` enviados como `null` são apagados."
    " `status` e `finished_at` só mudam pela rota de encerrar."
  ),
  responses=RESPONSES_UPDATE,
)
def update_habit(
  db: SessionDep,
  habit_id: UUID,
  data: HabitUpdate,
  user: Annotated[User, Depends(get_current_user)],
) -> HabitPublic:
  """Edita os campos enviados de um hábito do autor."""
  try:
    return service.update_habit(db, habit_id, user, data)
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
  except HabitForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_HABIT_FORBIDDEN) from None
  except TargetEndDateBeforeCreatedError:
    raise HTTPException(
      status.HTTP_422_UNPROCESSABLE_ENTITY, MSG_TARGET_END_DATE_BEFORE_CREATED
    ) from None
