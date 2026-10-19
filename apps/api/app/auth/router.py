from fastapi import APIRouter, HTTPException, Response, status

from app.auth import service
from app.auth.exceptions import (
  MSG_EMAIL_TAKEN,
  MSG_USERNAME_TAKEN,
  EmailTakenError,
  InvalidCredentialsError,
  UsernameTakenError,
)
from app.auth.schemas import (
  LoginRequest,
  LogoutRequest,
  SignupRequest,
  SignupResponse,
  TokenRefreshRequest,
  TokenResponse,
)
from app.auth.session.router import session_router
from app.auth.tokens import TokenExpiredError, TokenInvalidError
from app.database import SessionDep

auth_router = APIRouter(prefix="/auth", tags=["auth"])

auth_router.include_router(session_router)


@auth_router.post(
  "/signup", status_code=status.HTTP_201_CREATED, response_model=SignupResponse
)
def signup(data: SignupRequest, db: SessionDep) -> SignupResponse:
  """Cria a conta e já devolve o usuário autenticado com o par de tokens."""
  try:
    return service.register_user(db, data)

  except UsernameTakenError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_USERNAME_TAKEN) from None

  except EmailTakenError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_EMAIL_TAKEN) from None


@auth_router.post(
  "/refresh", status_code=status.HTTP_200_OK, response_model=TokenResponse
)
def refresh(token_refresh: TokenRefreshRequest, db: SessionDep) -> TokenResponse:
  """Troca um refresh token válido por um novo par de tokens."""
  try:
    return service.refresh_session(db, token_refresh.refresh_token)

  except TokenInvalidError:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido.") from None

  except TokenExpiredError:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expirado.") from None


@auth_router.post(
  "/login", status_code=status.HTTP_200_OK, response_model=TokenResponse
)
def login(db: SessionDep, dados: LoginRequest) -> TokenResponse:
  """Autentica por username ou e-mail e devolve o par de tokens."""
  try:
    return service.login(db, dados.login, dados.password)

  except InvalidCredentialsError:
    raise HTTPException(
      status.HTTP_401_UNAUTHORIZED, "Usuário ou senha inválidos."
    ) from None


@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: LogoutRequest, db: SessionDep) -> Response:
  """Encerra a sessão do refresh token. Responde sempre 204, sem corpo."""
  service.logout_session(db, data.refresh_token)
  return Response(status_code=status.HTTP_204_NO_CONTENT)
