from typing import Annotated
from uuid import UUID

from fastapi import (
  APIRouter,
  Depends,
  HTTPException,
  Request,
  Response,
  UploadFile,
  status,
)
from fastapi.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.checkins.exceptions import (
  MSG_CHECK_IN_FORBIDDEN,
  MSG_CHECK_IN_NOT_FOUND,
  CheckInForbiddenError,
  CheckInNotFoundError,
)
from app.database import SessionDep
from app.photos import service
from app.photos.exceptions import (
  MSG_PHOTO_INVALID,
  MSG_PHOTO_NOT_TODAY,
  MSG_PHOTO_STORAGE_FAILED,
  MSG_PHOTO_TOO_LARGE,
  MSG_PHOTO_UNSUPPORTED,
  PHOTO_MAX_BYTES,
  PhotoNotTodayError,
)
from app.photos.processing import InvalidImageError, UnsupportedImageError
from app.photos.responses import RESPONSES_PHOTO_DELETE, RESPONSES_PHOTO_PUT
from app.photos.schemas import CheckInPhotoPublic
from app.storage.base import StorageError

photos_router = APIRouter(tags=["check-ins"])

_MULTIPART_OVERHEAD_BYTES = 1024


def _check_content_length(request: Request) -> None:
  """Rejeita requisições acima de 4 MB + folga do multipart antes de ler o corpo."""
  raw_length = request.headers.get("content-length")
  if raw_length is None:
    return
  try:
    content_length = int(raw_length)
  except ValueError:
    return
  if content_length > PHOTO_MAX_BYTES + _MULTIPART_OVERHEAD_BYTES:
    raise HTTPException(
      status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
      MSG_PHOTO_TOO_LARGE,
    )


@photos_router.put(
  "/check-ins/{check_in_id}/photo",
  response_model=CheckInPhotoPublic,
  status_code=status.HTTP_200_OK,
  summary="Enviar ou substituir foto do check-in",
  description=(
    "Anexa ou substitui a foto de um check-in feito hoje pelo usuário logado."
    " Aceita JPEG ou PNG de até 4 MB no campo `photo` (`multipart/form-data`)."
  ),
  responses=RESPONSES_PHOTO_PUT,
)
async def put_check_in_photo(
  db: SessionDep,
  check_in_id: UUID,
  photo: UploadFile,
  request: Request,
  user: Annotated[User, Depends(get_current_user)],
) -> CheckInPhotoPublic:
  """Recebe o upload limitado a 4 MB e processa/salva a foto fora do event loop."""
  _check_content_length(request)

  data = await photo.read(PHOTO_MAX_BYTES + 1)
  if len(data) > PHOTO_MAX_BYTES:
    raise HTTPException(
      status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
      MSG_PHOTO_TOO_LARGE,
    )

  try:
    return await run_in_threadpool(
      service.set_check_in_photo, db, check_in_id, user, data
    )
  except CheckInNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_CHECK_IN_NOT_FOUND) from None
  except CheckInForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CHECK_IN_FORBIDDEN) from None
  except PhotoNotTodayError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_PHOTO_NOT_TODAY) from None
  except UnsupportedImageError:
    raise HTTPException(
      status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, MSG_PHOTO_UNSUPPORTED
    ) from None
  except InvalidImageError:
    raise HTTPException(status.HTTP_400_BAD_REQUEST, MSG_PHOTO_INVALID) from None
  except StorageError:
    raise HTTPException(
      status.HTTP_503_SERVICE_UNAVAILABLE, MSG_PHOTO_STORAGE_FAILED
    ) from None


@photos_router.delete(
  "/check-ins/{check_in_id}/photo",
  status_code=status.HTTP_204_NO_CONTENT,
  summary="Remover foto do check-in",
  description=(
    "Remove a foto de um check-in feito hoje pelo usuário logado."
    " Se o check-in não tiver foto, retorna 204 da mesma forma."
  ),
  responses=RESPONSES_PHOTO_DELETE,
)
def delete_check_in_photo(
  db: SessionDep,
  check_in_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> Response:
  """Remove a foto do check-in (idempotente). Responde 204 sem corpo."""
  try:
    service.remove_check_in_photo(db, check_in_id, user)
  except CheckInNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_CHECK_IN_NOT_FOUND) from None
  except CheckInForbiddenError:
    raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CHECK_IN_FORBIDDEN) from None
  except PhotoNotTodayError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_PHOTO_NOT_TODAY) from None
  return Response(status_code=status.HTTP_204_NO_CONTENT)
