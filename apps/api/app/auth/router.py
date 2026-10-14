from fastapi import APIRouter, HTTPException, status

from app.auth import service
from app.auth.schemas import TokenRefreshRequest, TokenResponse
from app.auth.tokens import TokenExpiredError, TokenInvalidError
from app.database import SessionDep

auth_router = APIRouter(prefix="/auth", tags=["auth"])


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
