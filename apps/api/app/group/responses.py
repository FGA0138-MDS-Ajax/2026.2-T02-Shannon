from fastapi import status

from app.group.exceptions import MSG_GROUP_FORBIDDEN, MSG_GROUP_NOT_FOUND

GROUP_NOT_FOUND_RESPONSE = {
  status.HTTP_404_NOT_FOUND: {
    "description": "Grupo inexistente ou usuário não é membro.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_NOT_FOUND}}},
  },
}

GROUP_FORBIDDEN_RESPONSE = {
  status.HTTP_403_FORBIDDEN: {
    "description": "Apenas administradores do grupo podem realizar esta ação.",
    "content": {"application/json": {"example": {"detail": MSG_GROUP_FORBIDDEN}}},
  },
}