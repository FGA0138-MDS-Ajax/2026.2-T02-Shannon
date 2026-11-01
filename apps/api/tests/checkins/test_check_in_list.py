from datetime import timedelta

from fastapi.testclient import TestClient

from app.auth.models import User
from app.habits.service import today
from tests.conftest import at_noon


def test_list_user_check_ins_unauthenticated(client: TestClient):
  # Garante que a listagem sem autenticação devolva 401.
  response = client.get("/check-ins")
  assert response.status_code == 401


def test_list_user_check_ins_empty(
  client: TestClient,
  auth_headers: dict[str, str],
):
  # Garante que um usuário sem check-ins receba lista vazia e paginação correta.
  response = client.get("/check-ins", headers=auth_headers)
  assert response.status_code == 200

  data = response.json()
  assert data["items"] == []
  assert data["page"] == 1
  assert data["has_more"] is False


def test_list_user_check_ins_grouped_by_date(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
):
  # Garante agrupamento no banco por data, formato { data: [checkins] }
  # e ordenação decrescente.
  habit = habit_factory(name="Leitura")

  day_today = today()
  day_yesterday = day_today - timedelta(days=1)
  day_earlier = day_today - timedelta(days=3)

  c1 = check_in_factory(
    habit,
    user=user,
    title="Leitura matinal",
    duration=timedelta(minutes=30),
    created_at=at_noon(day_today) - timedelta(hours=2),
  )
  c2 = check_in_factory(
    habit,
    user=user,
    title="Leitura noturna",
    created_at=at_noon(day_today) + timedelta(hours=6),
  )
  c3 = check_in_factory(
    habit,
    user=user,
    title="Leitura ontem",
    created_at=at_noon(day_yesterday),
  )
  c4 = check_in_factory(
    habit,
    user=user,
    title="Leitura anterior",
    created_at=at_noon(day_earlier),
  )

  response = client.get("/check-ins", headers=auth_headers)
  assert response.status_code == 200

  data = response.json()
  assert data["page"] == 1
  assert data["has_more"] is False

  items = data["items"]
  assert isinstance(items, list)
  assert len(items) == 3

  # Primeiro grupo: hoje (2 check-ins ordenados por created_at desc)
  assert list(items[0].keys()) == [day_today.isoformat()]
  today_check_ins = items[0][day_today.isoformat()]
  assert len(today_check_ins) == 2
  assert today_check_ins[0]["id"] == str(c2.id)
  assert today_check_ins[0]["title"] == "Leitura noturna"
  assert today_check_ins[0]["habit_ids"] == [str(habit.id)]
  assert today_check_ins[1]["id"] == str(c1.id)
  assert today_check_ins[1]["title"] == "Leitura matinal"
  assert today_check_ins[1]["duration"] == "PT30M"

  # Segundo grupo: ontem (1 check-in)
  assert list(items[1].keys()) == [day_yesterday.isoformat()]
  yesterday_check_ins = items[1][day_yesterday.isoformat()]
  assert len(yesterday_check_ins) == 1
  assert yesterday_check_ins[0]["id"] == str(c3.id)
  assert yesterday_check_ins[0]["title"] == "Leitura ontem"

  # Terceiro grupo: dia anterior (1 check-in)
  assert list(items[2].keys()) == [day_earlier.isoformat()]
  earlier_check_ins = items[2][day_earlier.isoformat()]
  assert len(earlier_check_ins) == 1
  assert earlier_check_ins[0]["id"] == str(c4.id)
  assert earlier_check_ins[0]["title"] == "Leitura anterior"


def test_list_user_check_ins_pagination_by_days(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
):
  # Garante paginação por dias distintos com page e page_size e indicador has_more.
  habit = habit_factory(name="Treino")

  base_day = today()
  # Cria check-ins em 4 dias distintos
  for offset in range(4):
    day = base_day - timedelta(days=offset)
    check_in_factory(
      habit,
      user=user,
      title=f"Treino dia {offset}",
      created_at=at_noon(day),
    )

  # Página 1: 2 dias
  res_p1 = client.get("/check-ins?page=1&page_size=2", headers=auth_headers)
  assert res_p1.status_code == 200
  data_p1 = res_p1.json()
  assert data_p1["page"] == 1
  assert data_p1["has_more"] is True
  assert len(data_p1["items"]) == 2
  days_p1 = [next(iter(item.keys())) for item in data_p1["items"]]
  assert days_p1 == [base_day.isoformat(), (base_day - timedelta(days=1)).isoformat()]

  # Página 2: 2 dias restantes
  res_p2 = client.get("/check-ins?page=2&page_size=2", headers=auth_headers)
  assert res_p2.status_code == 200
  data_p2 = res_p2.json()
  assert data_p2["page"] == 2
  assert data_p2["has_more"] is False
  assert len(data_p2["items"]) == 2
  days_p2 = [next(iter(item.keys())) for item in data_p2["items"]]
  assert days_p2 == [
    (base_day - timedelta(days=2)).isoformat(),
    (base_day - timedelta(days=3)).isoformat(),
  ]

  # Página 3: sem mais dias
  res_p3 = client.get("/check-ins?page=3&page_size=2", headers=auth_headers)
  assert res_p3.status_code == 200
  data_p3 = res_p3.json()
  assert data_p3["page"] == 3
  assert data_p3["has_more"] is False
  assert data_p3["items"] == []


def test_list_user_check_ins_invalid_pagination_params(
  client: TestClient,
  auth_headers: dict[str, str],
):
  # Garante recusa com 422 para page < 1, page_size < 1 ou page_size > 100.
  for invalid_query in ("page=0", "page_size=0", "page_size=101"):
    response = client.get(f"/check-ins?{invalid_query}", headers=auth_headers)
    assert response.status_code == 422


def test_list_user_check_ins_only_shows_logged_user(
  client: TestClient,
  user: User,
  other_user: User,
  auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
):
  # Garante que check-ins de outros usuários não apareçam na listagem.
  habit_user = habit_factory(author=user, name="Hábito do usuário")
  habit_other = habit_factory(author=other_user, name="Hábito de outro", is_public=True)

  c_user = check_in_factory(habit_user, user=user, title="Check-in do usuário")
  check_in_factory(habit_other, user=other_user, title="Check-in de outro")

  response = client.get("/check-ins", headers=auth_headers)
  assert response.status_code == 200

  data = response.json()
  assert len(data["items"]) == 1
  group_check_ins = next(iter(data["items"][0].values()))
  assert len(group_check_ins) == 1
  assert group_check_ins[0]["id"] == str(c_user.id)


def test_list_user_check_ins_includes_finished_habit(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  habit_factory,
  check_in_factory,
):
  # Garante que check-in de hábito encerrado continue aparecendo na listagem.
  finished_habit = habit_factory(name="Hábito encerrado", finished=True)
  check_in = check_in_factory(finished_habit, user=user, title="Check-in em encerrado")

  response = client.get("/check-ins", headers=auth_headers)
  assert response.status_code == 200

  data = response.json()
  assert len(data["items"]) == 1
  group_check_ins = next(iter(data["items"][0].values()))
  assert len(group_check_ins) == 1
  assert group_check_ins[0]["id"] == str(check_in.id)
  assert str(finished_habit.id) in group_check_ins[0]["habit_ids"]
