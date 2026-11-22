from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.exceptions import MSG_WRONG_CURRENT_PASSWORD, WrongCurrentPasswordError
from app.auth.models import User
from app.auth.schemas import PasswordChange, TokenResponse, UserPublic
from app.auth.session.responses import RESPONSES_CHANGE_PASSWORD
from app.database import SessionDep

session_router = APIRouter(prefix="/session", tags=["session"])


@session_router.get(
  "/me",
  status_code=status.HTTP_200_OK,
  response_model=UserPublic,
)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
  """Devolve os dados do usuário autenticado."""
  return current_user


@session_router.put(
  "/me/password",
  status_code=status.HTTP_200_OK,
  response_model=TokenResponse,
  summary="Trocar senha",
  description=(
    "Troca a senha do usuário logado. Exige a senha atual e a confirmação da"
    " nova, que precisa ser diferente da atual e segue as regras do cadastro (de 8"
    " caracteres a 72 bytes). **Todas as sessões do usuário são encerradas**,"
    " inclusive a deste aparelho: os refresh tokens antigos passam a responder 401"
    " `Token inválido.`, e os outros aparelhos voltam para o login na próxima"
    " renovação. A resposta traz um par de tokens novo, e o app deve **trocar os"
    " dois** tokens guardados. O access token já emitido nos outros aparelhos"
    " continua valendo até expirar. Senha atual errada responde 400, e não 401,"
    " para o app não confundir com problema de token."
  ),
  responses=RESPONSES_CHANGE_PASSWORD,
)
def change_password(
  data: PasswordChange,
  db: SessionDep,
  current_user: Annotated[User, Depends(get_current_user)],
) -> TokenResponse:
  """Troca a senha e devolve o par de tokens da sessão nova."""
  try:
    return service.change_password(db, current_user, data)
  except WrongCurrentPasswordError:
    raise HTTPException(
      status.HTTP_400_BAD_REQUEST, MSG_WRONG_CURRENT_PASSWORD
    ) from None
