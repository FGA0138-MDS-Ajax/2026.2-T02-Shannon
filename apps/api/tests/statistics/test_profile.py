"""QA-1, cenário 8: o perfil bate com `GET /user/statistics`."""

from datetime import date

from tests.conftest import at_noon

TODAY = date(2026, 11, 11)


def _perfil_e_estatisticas(client, headers) -> tuple[dict, dict]:
  perfil = client.get("/user/statistics/profile", headers=headers)
  estatisticas = client.get("/user/statistics", headers=headers)
  assert perfil.status_code == 200 and estatisticas.status_code == 200
  return perfil.json(), estatisticas.json()


def test_perfil_sem_check_ins_tem_zeros_e_bate_com_as_estatisticas(
  client, user, auth_headers, freeze_today
):
  freeze_today(TODAY)

  perfil, estatisticas = _perfil_e_estatisticas(client, auth_headers)

  assert perfil["id"] == str(user.id)
  assert perfil["username"] == user.username
  assert perfil["activity_streak"] == {"current": 0, "best": 0}
  assert perfil["check_ins_total"] == 0
  assert perfil["activity_streak"] == estatisticas["activity_streak"]
  assert perfil["check_ins_total"] == estatisticas["check_ins"]["total"]


def test_perfil_com_tres_dias_seguidos_bate_com_as_estatisticas(
  client, auth_headers, habit_factory, check_in_factory, freeze_today
):
  freeze_today(TODAY)
  habit = habit_factory()
  for day in (9, 10, 11):
    check_in_factory(habit, created_at=at_noon(date(2026, 11, day)))

  perfil, estatisticas = _perfil_e_estatisticas(client, auth_headers)

  assert perfil["activity_streak"] == {"current": 3, "best": 3}
  assert perfil["check_ins_total"] == 3
  assert perfil["activity_streak"] == estatisticas["activity_streak"]
  assert perfil["check_ins_total"] == estatisticas["check_ins"]["total"]
