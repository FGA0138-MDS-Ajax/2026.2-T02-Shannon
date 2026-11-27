from fastapi import status

from app.checkins.exceptions import MSG_CHECK_IN_FORBIDDEN, MSG_CHECK_IN_NOT_FOUND
from app.photos.exceptions import (
  MSG_PHOTO_INVALID,
  MSG_PHOTO_NOT_TODAY,
  MSG_PHOTO_STORAGE_FAILED,
  MSG_PHOTO_TOO_LARGE,
  MSG_PHOTO_UNSUPPORTED,
)


def _error_response(description: str, detail: str) -> dict:
  return {
    "description": description,
    "content": {"application/json": {"example": {"detail": detail}}},
  }


_RESPONSE_401 = {
  "description": "Usuário não autenticado ou token inválido.",
}

_RESPONSE_403 = _error_response(
  "Usuário vê o check-in, mas não foi quem o fez.",
  MSG_CHECK_IN_FORBIDDEN,
)

_RESPONSE_404 = _error_response(
  "Check-in inexistente ou sem nenhum hábito ligado visível ao usuário.",
  MSG_CHECK_IN_NOT_FOUND,
)

_RESPONSE_409 = _error_response(
  "O check-in não foi feito hoje.",
  MSG_PHOTO_NOT_TODAY,
)

_RESPONSE_422_PATH = {
  "description": "Identificador do check-in inválido ou campo `photo` ausente.",
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

RESPONSES_PHOTO_PUT = {
  status.HTTP_400_BAD_REQUEST: _error_response(
    "Arquivo de imagem corrompido, truncado ou grande demais em pixels.",
    MSG_PHOTO_INVALID,
  ),
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_409_CONFLICT: _RESPONSE_409,
  status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: _error_response(
    "Arquivo ultrapassa o limite de 4 MB.",
    MSG_PHOTO_TOO_LARGE,
  ),
  status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: _error_response(
    "Arquivo não é JPEG nem PNG.",
    MSG_PHOTO_UNSUPPORTED,
  ),
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
  status.HTTP_503_SERVICE_UNAVAILABLE: _error_response(
    "Falha ao gravar a foto no armazenamento.",
    MSG_PHOTO_STORAGE_FAILED,
  ),
}

RESPONSES_PHOTO_DELETE = {
  status.HTTP_401_UNAUTHORIZED: _RESPONSE_401,
  status.HTTP_403_FORBIDDEN: _RESPONSE_403,
  status.HTTP_404_NOT_FOUND: _RESPONSE_404,
  status.HTTP_409_CONFLICT: _RESPONSE_409,
  status.HTTP_422_UNPROCESSABLE_ENTITY: _RESPONSE_422_PATH,
}
