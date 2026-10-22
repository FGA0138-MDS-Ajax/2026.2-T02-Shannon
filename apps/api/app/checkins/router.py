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
from app.checkins.schemas import MSG_TITLE_NULL, CheckInPublic, CheckInUpdate
from app.database import SessionDep

check_ins_router = APIRouter(tags=["check-ins"])

_RESPONSE_403 = {
  "description": "Quem vê o check-in, mas não foi quem o fez.",
  "content": {"application/json": {"example": {"detail": MSG_CHECK_IN_FORBIDDEN}}},
}

_RESPONSE_404 = {
  "description": (
    "Check-in inexistente ou sem nenhum hábito ligado visível ao usuário."
  ),
  "content": {"application/json": {"example": {"detail": MSG_CHECK_IN_NOT_FOUND}}},
}

_RESPONSE_422_PATH = {
  "description": "Identificador do check-in inválido (não é um UUID).",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["path", "check_in_id"],
            "msg": "Input should be a valid UUID",
            "type": "uuid_parsing",
          }
        ]
      }
    }
  },
}

_RESPONSE_422_UPDATE = {
  "description": "Dados inválidos, como `title` nulo ou duração fora do padrão.",
  "content": {
    "application/json": {
      "example": {
        "detail": [
          {
            "loc": ["body"],
            "msg": f"Value error, {MSG_TITLE_NULL}",
            "type": "value_error",
          }
        ]
      }
    }
  },
}

_RESPONSES_GET_BY_ID = {
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}

_RESPONSES_UPDATE = {
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_UPDATE,
}

_RESPONSES_DELETE = {
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}


@check_ins_router.get(
  "/check-ins/{check_in_id}",
  response_model=CheckInPublic,
  status_code=status.HTTP_200_OK,
  summary="Consultar check-in por id",
  description=(
    "Devolve o check-in se o usuário o fez ou vê algum hábito ligado a ele."
    " Quem não fez o check-in recebe só os `habit_ids` que pode ver."
  ),
  responses=_RESPONSES_GET_BY_ID,
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
  responses=_RESPONSES_UPDATE,
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
  responses=_RESPONSES_DELETE,
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
