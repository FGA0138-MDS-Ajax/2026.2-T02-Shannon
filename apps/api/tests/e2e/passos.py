"""Passos reutilizáveis dos fluxos E2E.

Cada passo faz uma chamada à API, confere o status e devolve só o que o passo
seguinte precisa (um `Usuario`, o corpo da resposta). Se algum passo falhar, a
mensagem do `assert` mostra a rota, o status e o corpo, então o log já diz em
que etapa do fluxo o problema apareceu.

Os passos só conhecem o que a API devolve: o token vem do cadastro e os ids vêm
das respostas. Não há factory, não há acesso ao banco e não há token fabricado.

Os fluxos conferem o conteúdo das respostas; os passos conferem só o status.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any
from uuid import uuid4

from httpx import Client, Response

from tests.support.images import photo_files, png_bytes

SENHA = "Senha-forte-123"

META_DIARIA: dict[str, Any] = {"period": "day"}
# 1 check-in por semana, e não mais: a meta começa hoje e a semana fecha no
# domingo. Com `target_count` maior, o resultado dependeria do dia em que o
# teste roda (num sábado, 3 check-ins já não cabem e o status vira `failed`).
META_SEMANAL: dict[str, Any] = {
  "period": "week",
  "target_count": 1,
  "period_end_weekday": 7,
}


@dataclass(frozen=True)
class Usuario:
  """Quem está usando o app: os dados do cadastro e o par de tokens atual."""

  id: str
  username: str
  email: str
  name: str
  password: str
  access_token: str
  refresh_token: str

  @property
  def headers(self) -> dict[str, str]:
    return {"Authorization": f"Bearer {self.access_token}"}


def _checar(resposta: Response, esperado: int) -> Response:
  """Confere o status. Se falhar, a mensagem traz a rota, o status e o corpo."""
  assert resposta.status_code == esperado, (
    f"{resposta.request.method} {resposta.request.url.path}: "
    f"esperado {esperado}, veio {resposta.status_code}: {resposta.text}"
  )
  return resposta


def cadastrar(api: Client, nome: str = "ana") -> Usuario:
  """`POST /auth/signup` com dados únicos. `nome` só pode ter `[a-z0-9_.]`.

  O username e o e-mail vão como uma pessoa pode digitar (maiúsculas e espaços
  nas pontas); a API deve devolvê-los normalizados.
  """
  username = f"{nome}_{uuid4().hex[:8]}"
  email = f"{username}@teste.dev"
  corpo = _checar(
    api.post(
      "/auth/signup",
      json={
        "username": f" {username.upper()} ",
        "email": f" {email.upper()} ",
        "password": SENHA,
        "name": nome.capitalize(),
      },
    ),
    201,
  ).json()
  assert corpo["user"]["username"] == username, corpo
  assert corpo["user"]["email"] == email, corpo
  return Usuario(
    id=corpo["user"]["id"],
    username=corpo["user"]["username"],
    email=corpo["user"]["email"],
    name=corpo["user"]["name"],
    password=SENHA,
    access_token=corpo["token"]["access_token"],
    refresh_token=corpo["token"]["refresh_token"],
  )


def login(api: Client, usuario: Usuario) -> Usuario:
  """`POST /auth/login` pelo e-mail e senha. Devolve o usuário com tokens novos."""
  corpo = _checar(
    api.post(
      "/auth/login", json={"login": usuario.email, "password": usuario.password}
    ),
    200,
  ).json()
  return replace(
    usuario,
    access_token=corpo["access_token"],
    refresh_token=corpo["refresh_token"],
  )


def renovar(api: Client, usuario: Usuario) -> Usuario:
  """`POST /auth/refresh`. Devolve o usuário com o par de tokens novo.

  O refresh token do `usuario` deixa de valer: usá-lo de novo derruba a sessão.
  """
  corpo = _checar(
    api.post("/auth/refresh", json={"refresh_token": usuario.refresh_token}), 200
  ).json()
  return replace(
    usuario,
    access_token=corpo["access_token"],
    refresh_token=corpo["refresh_token"],
  )


def sair(api: Client, usuario: Usuario) -> None:
  """`POST /auth/logout`: encerra a sessão do refresh token. Responde 204."""
  _checar(api.post("/auth/logout", json={"refresh_token": usuario.refresh_token}), 204)


def trocar_senha(api: Client, usuario: Usuario, nova_senha: str) -> Usuario:
  """`PUT /auth/session/me/password`: troca a senha e devolve tokens novos.

  A API encerra todas as sessões do usuário e abre uma nova para este aparelho.
  """
  corpo = _checar(
    api.put(
      "/auth/session/me/password",
      headers=usuario.headers,
      json={
        "current_password": usuario.password,
        "new_password": nova_senha,
        "new_password_confirmation": nova_senha,
      },
    ),
    200,
  ).json()
  return replace(
    usuario,
    password=nova_senha,
    access_token=corpo["access_token"],
    refresh_token=corpo["refresh_token"],
  )


def perfil(api: Client, usuario: Usuario) -> dict[str, Any]:
  """`GET /auth/session/me`: o usuário como a API o enxerga."""
  return _checar(api.get("/auth/session/me", headers=usuario.headers), 200).json()


def criar_habito(
  api: Client,
  usuario: Usuario,
  nome: str = "Correr",
  categoria: str = "corrida",
  meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
  """`POST /habits`. A meta é obrigatória; sem `meta`, nasce diária."""
  return _checar(
    api.post(
      "/habits",
      headers=usuario.headers,
      json={"name": nome, "category": categoria, "goal": meta or META_DIARIA},
    ),
    201,
  ).json()


def listar_habitos(api: Client, usuario: Usuario) -> list[dict[str, Any]]:
  """`GET /habits`: os hábitos do usuário, com o progresso de cada um."""
  return _checar(api.get("/habits", headers=usuario.headers), 200).json()


def detalhe_habito(api: Client, usuario: Usuario, habit_id: str) -> dict[str, Any]:
  """`GET /habits/{id}`: o hábito, se ele for visível ao usuário."""
  return _checar(api.get(f"/habits/{habit_id}", headers=usuario.headers), 200).json()


def definir_meta(
  api: Client, usuario: Usuario, habit_id: str, meta: dict[str, Any]
) -> dict[str, Any]:
  """`PUT /goals/habits/{id}/goal`. Só reinicia o streak se a regra mudar."""
  return _checar(
    api.put(f"/goals/habits/{habit_id}/goal", headers=usuario.headers, json=meta),
    200,
  ).json()


def fazer_checkin(
  api: Client,
  usuario: Usuario,
  habit_ids: list[str],
  titulo: str = "Treino de hoje",
) -> dict[str, Any]:
  """`POST /check-ins` em um ou mais hábitos. A resposta traz o `progress`."""
  return _checar(
    api.post(
      "/check-ins",
      headers=usuario.headers,
      json={"title": titulo, "habit_ids": habit_ids},
    ),
    201,
  ).json()


def enviar_foto(api: Client, usuario: Usuario, check_in_id: str) -> dict[str, Any]:
  """`PUT /check-ins/{id}/photo` com um PNG gerado em memória.

  Só vale para check-in feito hoje; por isso o fluxo faz a foto logo depois do
  check-in, sem congelar a data.
  """
  return _checar(
    api.put(
      f"/check-ins/{check_in_id}/photo",
      headers=usuario.headers,
      files=photo_files(png_bytes(), name="foto.png", mime="image/png"),
    ),
    200,
  ).json()


def detalhe_checkin(api: Client, usuario: Usuario, check_in_id: str) -> dict[str, Any]:
  """`GET /check-ins/{id}`: o check-in, com a foto nas duas versões."""
  return _checar(
    api.get(f"/check-ins/{check_in_id}", headers=usuario.headers), 200
  ).json()


def listar_checkins(api: Client, usuario: Usuario) -> dict[str, Any]:
  """`GET /check-ins`: a página de check-ins do usuário, agrupados por dia."""
  return _checar(api.get("/check-ins", headers=usuario.headers), 200).json()


def checkins_do_habito(
  api: Client, usuario: Usuario, habit_id: str
) -> list[dict[str, Any]]:
  """`GET /habits/{id}/check-ins`: o histórico do hábito."""
  return _checar(
    api.get(f"/habits/{habit_id}/check-ins", headers=usuario.headers), 200
  ).json()


def progresso(api: Client, usuario: Usuario, habit_id: str) -> dict[str, Any]:
  """`GET /goals/habits/{id}/progress`: a meta e o progresso do hábito."""
  return _checar(
    api.get(f"/goals/habits/{habit_id}/progress", headers=usuario.headers), 200
  ).json()


def estatisticas(api: Client, usuario: Usuario) -> dict[str, Any]:
  """`GET /user/statistics`: os totais do usuário."""
  return _checar(api.get("/user/statistics", headers=usuario.headers), 200).json()


def criar_grupo(
  api: Client,
  usuario: Usuario,
  nome: str = "Corredores",
  criterio: str = "check_ins",
) -> dict[str, Any]:
  """`POST /groups`. Quem cria vira administrador. O corpo traz o `invite_code`."""
  return _checar(
    api.post(
      "/groups",
      headers=usuario.headers,
      json={"name": nome, "ranking_criterion": criterio},
    ),
    201,
  ).json()


def listar_grupos(api: Client, usuario: Usuario) -> list[dict[str, Any]]:
  """`GET /groups`: os grupos de que o usuário é membro."""
  return _checar(api.get("/groups", headers=usuario.headers), 200).json()


def detalhe_grupo(api: Client, usuario: Usuario, group_id: str) -> dict[str, Any]:
  """`GET /groups/{id}`: o grupo, para quem é membro."""
  return _checar(api.get(f"/groups/{group_id}", headers=usuario.headers), 200).json()
