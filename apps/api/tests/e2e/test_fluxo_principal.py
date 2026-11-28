"""Fluxo principal: o caminho que todo usuário faz no primeiro dia de uso.

Cadastro, login, primeiro hábito, meta, check-in, foto e conferência dos números.
Cada passo usa só o que o passo anterior devolveu (token, `habit_id`,
`check_in_id`), como o app faria.

Risco conhecido: o check-in nasce "hoje" e a foto só vale para check-in de hoje.
Se o relógio virar o dia entre os dois passos, a foto recebe 409. A chance é
mínima e não vale congelar a data, que esconderia o comportamento real.
"""

from datetime import date
from uuid import UUID

from app.habits.service import today
from tests.e2e import passos


def _checkins_da_pagina(pagina: dict) -> list[dict]:
  """Achata `GET /check-ins`, que agrupa os check-ins por dia."""
  return [
    check_in
    for dia in pagina["items"]
    for check_ins_do_dia in dia.values()
    for check_in in check_ins_do_dia
  ]


def test_usuario_cria_habito_faz_checkin_e_envia_foto(api):
  # 1. Cadastro: a API devolve o usuário normalizado e o par de tokens.
  ana = passos.cadastrar(api, "ana")
  assert UUID(ana.id)
  assert ana.username.startswith("ana_")
  assert ana.username == ana.username.strip().lower()
  assert ana.access_token
  assert ana.refresh_token
  assert ana.access_token != ana.refresh_token

  # 2. Login com o e-mail e a senha do cadastro; a sessão é a mesma pessoa.
  ana = passos.login(api, ana)
  eu = passos.perfil(api, ana)
  assert eu == {
    "id": ana.id,
    "name": ana.name,
    "username": ana.username,
    "email": ana.email,
  }

  # 3. Primeiro hábito: o autor é quem está logado e ele aparece na lista.
  habito = passos.criar_habito(api, ana, "Correr")
  habit_id = habito["id"]
  assert habito["name"] == "Correr"
  assert habito["author_user_id"] == ana.id
  assert habito["status"] == "active"
  assert habito["group"] is None
  assert habito["goal"]["period"] == "day"
  assert [h["id"] for h in passos.listar_habitos(api, ana)] == [habit_id]

  # 4. Troca a meta de diária para semanal: o streak recomeça hoje, sem check-ins.
  meta = passos.definir_meta(api, ana, habit_id, passos.META_SEMANAL)
  assert meta["period"] == "week"
  assert meta["target_count"] == 1
  assert meta["starts_on"] == today().isoformat()
  antes = passos.progresso(api, ana, habit_id)
  assert antes["goal"] == meta
  assert antes["current_period"]["done"] == 0
  assert antes["status"] != "completed"

  # 5. Check-in no hábito: conta no progresso e aparece nas duas listas.
  checkin = passos.fazer_checkin(api, ana, [habit_id])
  check_in_id = checkin["id"]
  assert checkin["user_id"] == ana.id
  assert checkin["habit_ids"] == [habit_id]
  assert checkin["photo"] is None
  assert [p["habit_id"] for p in checkin["progress"]] == [habit_id]
  assert checkin["progress"][0]["current_period"]["done"] == 1
  assert [c["id"] for c in _checkins_da_pagina(passos.listar_checkins(api, ana))] == [
    check_in_id
  ]
  assert [c["id"] for c in passos.checkins_do_habito(api, ana, habit_id)] == [
    check_in_id
  ]

  # 6. Foto do check-in: a API devolve a versão cheia e a miniatura.
  foto = passos.enviar_foto(api, ana, check_in_id)
  assert foto["thumbnail_url"]
  assert foto["url"]
  detalhe = passos.detalhe_checkin(api, ana, check_in_id)
  assert detalhe["photo"]["thumbnail_url"]
  assert detalhe["photo"]["url"]

  # 7. Progresso da meta: o check-in do passo 5 conta no período atual.
  depois = passos.progresso(api, ana, habit_id)
  assert depois["current_period"]["done"] == 1
  assert depois["current_period"]["target_count"] == 1
  assert depois["status"] == "completed"
  inicio = date.fromisoformat(depois["current_period"]["start"])
  fim = date.fromisoformat(depois["current_period"]["end"])
  assert inicio <= today() <= fim

  # 8. Estatísticas: os totais refletem 1 hábito e 1 check-in deste fluxo.
  estatisticas = passos.estatisticas(api, ana)
  assert estatisticas["habits"] == {"total": 1, "active": 1, "finished": 0}
  assert estatisticas["check_ins"]["total"] == 1
  assert estatisticas["check_ins"]["today"] == 1
