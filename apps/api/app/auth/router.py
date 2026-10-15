from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import TokenRefreshRequest, TokenResponse, UserPublic
from app.auth.tokens import TokenExpiredError, TokenInvalidError
from app.database import SessionDep

auth_router = APIRouter(prefix="/auth", tags=["auth"])
session_router = APIRouter(prefix="/session", tags=["session"])


@auth_router.post(
  "/refresh", status_code=status.HTTP_200_OK, response_model=TokenResponse
)
def refresh(token_refresh: TokenRefreshRequest, db: SessionDep):
  """Troca um refresh token válido por um novo par de tokens."""
  try:
    return service.refresh_session(db, token_refresh.refresh_token)

  except TokenInvalidError:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido.") from None

  except TokenExpiredError:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expirado.") from None


@session_router.get("/me", status_code=status.HTTP_200_OK, response_model=UserPublic)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
  """Devolve os dados do usuário autenticado."""
  return current_user
