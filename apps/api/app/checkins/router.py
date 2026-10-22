from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins import service
from app.checkins.exceptions import (
  MSG_CHECK_IN_FORBIDDEN,
  MSG_CHECK_IN_NOT_FOUND,
  CheckInForbiddenError,
  CheckInNotFoundError,
)
from app.checkins.responses import (
  RESPONSES_DELETE,
  RESPONSES_GET_BY_ID,
  RESPONSES_UPDATE,
)
from app.checkins.schemas import CheckInPublic, CheckInUpdate
from app.database import SessionDep

check_ins_router = APIRouter(tags=["check-ins"])


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
