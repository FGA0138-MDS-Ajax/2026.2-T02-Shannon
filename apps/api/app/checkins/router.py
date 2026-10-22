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
from app.checkins.schemas import CheckInPublic, CheckInUpdate
from app.database import SessionDep

check_ins_router = APIRouter(tags=["check-ins"])


@check_ins_router.get(
  "/check-ins/{check_in_id}",
  response_model=CheckInPublic,
  status_code=status.HTTP_200_OK,
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
  "/check-ins/{check_in_id}", status_code=status.HTTP_204_NO_CONTENT
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
