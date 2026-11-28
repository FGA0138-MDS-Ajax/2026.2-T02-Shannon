"""Fluxos de segurança: o que a API não pode deixar passar.

Os dados vêm só da API, como nos outros fluxos E2E: cada pessoa se cadastra e
usa o próprio token. Complementa os testes de IDOR que já existem, que usam um
segundo usuário gravado direto no banco, provando o mesmo com o cadastro real.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest

from tests.e2e import passos
from tests.support.images import photo_files, png_bytes


def _recusada(resposta, rota: str) -> None:
  """Confere que a API recusou o acesso, sem revelar nem alterar nada.

  404 (não revela que o dado existe) e 403 (existe, mas não é seu) valem os
  dois; o que não pode vir é 2xx.
  """
  assert resposta.status_code in (403, 404), (
    f"{rota}: esperado 403 ou 404, veio {resposta.status_code}: {resposta.text}"
  )


def test_usuario_nao_acessa_dados_de_outro(api):
  # Ana cadastra e monta os dados dela: hábito, check-in com foto e grupo.
  ana = passos.cadastrar(api, "ana")
  habito = passos.criar_habito(api, ana, "Correr")
  habit_id = habito["id"]
  checkin = passos.fazer_checkin(api, ana, [habit_id])
  check_in_id = checkin["id"]
  passos.enviar_foto(api, ana, check_in_id)
  foto_da_ana = passos.detalhe_checkin(api, ana, check_in_id)["photo"]
  grupo = passos.criar_grupo(api, ana, "Grupo da Ana")
  group_id = grupo["id"]

  # Bia cadastra e tenta mexer em tudo o que é da Ana, com ids que só a Ana tem.
  bia = passos.cadastrar(api, "bia")
  h = bia.headers

  # O hábito: ler, editar e apagar.
  _recusada(api.get(f"/habits/{habit_id}", headers=h), "GET /habits/{id}")
  _recusada(
    api.patch(f"/habits/{habit_id}", headers=h, json={"name": "Hackeado"}),
    "PATCH /habits/{id}",
  )
  _recusada(api.delete(f"/habits/{habit_id}", headers=h), "DELETE /habits/{id}")

  # O check-in: ler, trocar a foto e apagar.
  _recusada(api.get(f"/check-ins/{check_in_id}", headers=h), "GET /check-ins/{id}")
  _recusada(
    api.put(
      f"/check-ins/{check_in_id}/photo",
      headers=h,
      files=photo_files(png_bytes(), name="foto.png", mime="image/png"),
    ),
    "PUT /check-ins/{id}/photo",
  )
  _recusada(
    api.delete(f"/check-ins/{check_in_id}", headers=h), "DELETE /check-ins/{id}"
  )

  # O grupo: o feed e o ranking.
  _recusada(
    api.get(f"/groups/{group_id}/check-ins", headers=h), "GET /groups/{id}/check-ins"
  )
  _recusada(
    api.get(f"/groups/{group_id}/ranking", headers=h), "GET /groups/{id}/ranking"
  )

  # Bia não enxerga nada da Ana nas próprias listas.
  assert passos.listar_habitos(api, bia) == []
  assert passos.listar_grupos(api, bia) == []
  assert passos.listar_checkins(api, bia)["items"] == []

  # Ana confere que nada mudou, nem pela tentativa de apagar, nem pela de trocar.
  assert passos.detalhe_habito(api, ana, habit_id)["name"] == "Correr"
  assert passos.detalhe_checkin(api, ana, check_in_id)["photo"] == foto_da_ana
  assert [g["id"] for g in passos.listar_grupos(api, ana)] == [group_id]
  assert passos.detalhe_grupo(api, ana, group_id)["members_count"] == 1


# Uma rota de cada módulo. `{habit_id}` é preenchido com o hábito real da Ana:
# com um id inventado, o caso "access válido" daria 404 em vez de 200.
ROTAS = {
  "habitos": "/habits",
  "check_ins": "/check-ins",
  "metas": "/goals/habits/{habit_id}/progress",
  "grupos": "/groups",
  "estatisticas": "/user/statistics",
}

SEGREDO_DO_ATACANTE = "segredo-do-atacante-com-mais-de-32-bytes-de-tamanho"


def _token_de_outro_segredo(ana: passos.Usuario) -> str:
  """Access token bem formado, da Ana, mas assinado com um segredo que não é o da API.

  É o único token fabricado dos testes E2E, e é de propósito: representa o ataque
  de quem forja um token. Todo o resto do payload é válido.
  """
  agora = datetime.now(UTC)
  return jwt.encode(
    {
      "sub": ana.id,
      "type": "access",
      "iat": int(agora.timestamp()),
      "exp": int((agora + timedelta(minutes=15)).timestamp()),
      "jti": str(uuid4()),
    },
    SEGREDO_DO_ATACANTE,
    algorithm="HS256",
  )


# credencial -> (como montar os cabeçalhos a partir da Ana, status esperado)
CREDENCIAIS = {
  "sem_header": (lambda ana: {}, 401),
  "token_lixo": (lambda ana: {"Authorization": "Bearer abc.def.ghi"}, 401),
  "outro_segredo": (
    lambda ana: {"Authorization": f"Bearer {_token_de_outro_segredo(ana)}"},
    401,
  ),
  "refresh_no_lugar_do_access": (
    lambda ana: {"Authorization": f"Bearer {ana.refresh_token}"},
    401,
  ),
  "access_valido": (lambda ana: ana.headers, 200),
}


@pytest.mark.parametrize("credencial", CREDENCIAIS)
@pytest.mark.parametrize("rota", ROTAS)
def test_rotas_protegidas_exigem_token(api, rota, credencial):
  ana = passos.cadastrar(api, "ana")
  habito = passos.criar_habito(api, ana, "Correr")
  caminho = ROTAS[rota].format(habit_id=habito["id"])
  montar_cabecalhos, esperado = CREDENCIAIS[credencial]
  cabecalhos = montar_cabecalhos(ana)

  resposta = api.get(caminho, headers=cabecalhos)

  assert resposta.status_code == esperado, (
    f"GET {ROTAS[rota]} com '{credencial}': esperado {esperado}, "
    f"veio {resposta.status_code}: {resposta.text}"
  )


def _status_do_refresh(api, refresh_token: str) -> int:
  """Tenta renovar com este refresh token e devolve só o status."""
  return api.post("/auth/refresh", json={"refresh_token": refresh_token}).status_code


def test_ciclo_de_sessao(api):
  ana = passos.cadastrar(api, "ana")

  # Login: a sessão nasce com o refresh R1.
  ana = passos.login(api, ana)
  r1 = ana.refresh_token

  # Renovar com R1 dá um par novo (R2) e o access novo funciona.
  ana = passos.renovar(api, ana)
  r2 = ana.refresh_token
  assert r2 != r1
  assert passos.perfil(api, ana)["id"] == ana.id

  # Reusar R1, já gasto, é sinal de token roubado: a API recusa...
  assert _status_do_refresh(api, r1) == 401
  # ...e derruba a sessão inteira: até o R2, legítimo, deixa de valer.
  assert _status_do_refresh(api, r2) == 401

  # A conta não ficou trancada: um login novo abre outra sessão (R3).
  ana = passos.login(api, ana)
  r3 = ana.refresh_token
  assert r3 not in (r1, r2)

  # Logout encerra a sessão no servidor: o R3 não renova mais.
  passos.sair(api, ana)
  assert _status_do_refresh(api, r3) == 401


def test_troca_de_senha_derruba_as_sessoes_antigas(api):
  ana = passos.cadastrar(api, "ana")
  senha_antiga = ana.password
  r_do_cadastro = ana.refresh_token
  # Um segundo aparelho: outro login, outra sessão.
  ana = passos.login(api, ana)
  r_do_outro_aparelho = ana.refresh_token

  ana = passos.trocar_senha(api, ana, "Outra-senha-456")

  # Todas as sessões antigas caíram...
  assert _status_do_refresh(api, r_do_cadastro) == 401
  assert _status_do_refresh(api, r_do_outro_aparelho) == 401
  # ...e a sessão nova, aberta pela própria troca, funciona.
  assert passos.perfil(api, ana)["id"] == ana.id
  assert _status_do_refresh(api, ana.refresh_token) == 200

  # A senha antiga não entra mais; a nova entra.
  antiga = api.post("/auth/login", json={"login": ana.email, "password": senha_antiga})
  assert antiga.status_code == 401
  assert passos.login(api, ana).email == ana.email
