from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.exceptions import (
  MSG_EMAIL_TAKEN,
  MSG_USERNAME_TAKEN,
  MSG_WRONG_CURRENT_PASSWORD,
  EmailTakenError,
  UsernameTakenError,
  WrongCurrentPasswordError,
)
from app.auth.models import User
from app.auth.schemas import PasswordChange, TokenResponse, UserPublic, UserUpdate
from app.auth.session.responses import (
  RESPONSES_CHANGE_PASSWORD,
  RESPONSES_UPDATE_ACCOUNT,
)
from app.database import SessionDep

session_router = APIRouter(prefix="/session", tags=["session"])

_UPDATE_ACCOUNT_EXAMPLES = {
  "nome": {"summary": "Só o nome", "value": {"name": "Maria S."}},
  "username": {"summary": "Só o username", "value": {"username": "maria_silva"}},
  "email": {
    "summary": "E-mail (exige a senha atual)",
    "value": {"email": "maria@exemplo.com", "current_password": "senha-atual"},
  },
}


@session_router.get(
  "/me",
  status_code=status.HTTP_200_OK,
  response_model=UserPublic,
)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
  """Devolve os dados do usuário autenticado."""
  return current_user


@session_router.patch(
  "/me",
  status_code=status.HTTP_200_OK,
  response_model=UserPublic,
  summary="Editar conta",
  description=(
    "Altera nome, username e e-mail do usuário logado. Só os campos enviados"
    " mudam; campo omitido fica como está e campo enviado como `null` é recusado."
    " As regras são as do cadastro. **Trocar o e-mail exige `current_password`**,"
    " porque o e-mail serve de login; nome e username não exigem. Username ou"
    " e-mail de outra conta responde 409; o valor atual da própria pessoa não é"
    " erro. Senha atual errada responde 400, e não 401, para o app não confundir"
    " com problema de token. **Os tokens continuam valendo**: nenhuma sessão é"
    " encerrada. O username antigo fica livre para outra pessoa."
  ),
  responses=RESPONSES_UPDATE_ACCOUNT,
)
def update_me(
  data: Annotated[UserUpdate, Body(openapi_examples=_UPDATE_ACCOUNT_EXAMPLES)],
  db: SessionDep,
  current_user: Annotated[User, Depends(get_current_user)],
) -> User:
  """Altera os dados da conta e devolve o usuário atualizado."""
  try:
    return service.update_account(db, current_user, data)
  except WrongCurrentPasswordError:
    raise HTTPException(
      status.HTTP_400_BAD_REQUEST, MSG_WRONG_CURRENT_PASSWORD
    ) from None
  except UsernameTakenError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_USERNAME_TAKEN) from None
  except EmailTakenError:
    raise HTTPException(status.HTTP_409_CONFLICT, MSG_EMAIL_TAKEN) from None


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
