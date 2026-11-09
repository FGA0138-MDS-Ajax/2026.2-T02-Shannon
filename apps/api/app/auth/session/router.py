from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import UserPublic

session_router = APIRouter(prefix="/session", tags=["session"])


@session_router.get(
  "/me",
  status_code=status.HTTP_200_OK,
  response_model=UserPublic,
)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
  """Devolve os dados do usuário autenticado."""
  return current_user
