from datetime import date
from uuid import uuid4

from app.goals.models import GoalPeriod
from tests.conftest import at_noon


def test_habit_statistics_returns_check_ins_and_progress(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Fixa a data para tornar os períodos do teste previsíveis.
  freeze_today(date(2026, 11, 7))

  habit = habit_factory(name="Correr")
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Registra check-ins em dias diferentes.
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 5)))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 7)))

  response = client.get(
    f"/user/statistics/habits/{habit.id}",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["habit_id"] == str(habit.id)
  assert data["name"] == "Correr"
  assert data["habit_status"] == "active"

  # Confere os totais de check-ins do hábito.
  assert data["check_ins"] == {
    "total": 2,
    "today": 1,
    "week": 2,
    "month": 2,
  }

  # Confere se o progresso da meta foi incluído.
  assert data["progress"] is not None
  assert data["progress"]["name"] == "Correr"
  assert data["progress"]["checked_today"] is True


def test_habit_statistics_without_goal_returns_null_progress(
  client,
  auth_headers,
  habit_factory,
  freeze_today,
):
  # Fixa a data para conferir a referência da resposta.
  freeze_today(date(2026, 11, 7))

  habit = habit_factory(name="Ler")

  response = client.get(
    f"/user/statistics/habits/{habit.id}",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["name"] == "Ler"
  assert data["progress"] is None
  assert data["check_ins"]["total"] == 0


def test_habit_statistics_counts_only_requested_habit(
  client,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
):
  # Fixa a data para tornar a série previsível.
  freeze_today(date(2026, 11, 7))

  habit_a = habit_factory(name="Correr")
  habit_b = habit_factory(name="Ler")

  # Um check-in está vinculado aos dois hábitos.
  check_in_factory(
    [habit_a, habit_b],
    created_at=at_noon(date(2026, 11, 7)),
  )

  # Outro check-in está vinculado somente ao segundo hábito.
  check_in_factory(
    habit_b,
    created_at=at_noon(date(2026, 11, 6)),
  )

  response = client.get(
    f"/user/statistics/habits/{habit_a.id}",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  # O check-in compartilhado deve contar para o hábito solicitado.
  assert data["check_ins"]["total"] == 1
  assert data["check_ins"]["today"] == 1


def test_habit_statistics_returns_404_for_another_users_habit(
  client,
  auth_headers,
  other_user,
  habit_factory,
):
  # Cria um hábito público de outro usuário para testar a regra de propriedade.
  habit = habit_factory(author=other_user, is_public=True)

  response = client.get(
    f"/user/statistics/habits/{habit.id}",
    headers=auth_headers,
  )

  # A API não deve revelar estatísticas de hábitos que não pertencem ao usuário.
  assert response.status_code == 404


def test_habit_statistics_returns_404_for_nonexistent_habit(
  client,
  auth_headers,
):
  # Usa um UUID válido que não corresponde a nenhum hábito cadastrado.
  nonexistent_id = uuid4()

  response = client.get(
    f"/user/statistics/habits/{nonexistent_id}",
    headers=auth_headers,
  )

  assert response.status_code == 404


def test_habit_statistics_requires_authentication(
  client,
  habit_factory,
):
  # Cria um hábito para consultar sem enviar credenciais.
  habit = habit_factory()

  response = client.get(
    f"/user/statistics/habits/{habit.id}",
  )

  assert response.status_code == 401


def test_habit_statistics_rejects_invalid_days(
  client,
  auth_headers,
  habit_factory,
):
  # Cria um hábito para testar o limite mínimo do parâmetro days.
  habit = habit_factory()

  response = client.get(
    f"/user/statistics/habits/{habit.id}?days=0",
    headers=auth_headers,
  )

  assert response.status_code == 422


def test_habit_statistics_rejects_invalid_mode(
  client,
  auth_headers,
  habit_factory,
):
  # Cria um hábito para testar um modo que não pertence ao enum.
  habit = habit_factory()

  response = client.get(
    f"/user/statistics/habits/{habit.id}?mode=invalid",
    headers=auth_headers,
  )

  assert response.status_code == 422


def test_habit_statistics_includes_finished_habit_progress(
  client,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  # Define a data atual e a data em que o hábito foi encerrado.
  freeze_today(date(2026, 11, 7))
  finished_at = date(2026, 11, 5)

  habit = habit_factory(
    name="Caminhar",
    finished=True,
    finished_at=finished_at,
  )
  goal_factory(
    habit,
    period=GoalPeriod.DAY,
    target_count=1,
  )

  # Registra check-ins até o encerramento do hábito.
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 4)))
  check_in_factory(habit, created_at=at_noon(finished_at))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 6)))

  response = client.get(
    f"/user/statistics/habits/{habit.id}",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  assert data["habit_status"] == "finished"
  assert data["progress"] is not None

  # O progresso deve terminar na data de encerramento.
  assert data["progress"]["status"] == "ended"
  assert data["progress"]["current_period"]["start"] == "2026-11-05"
  assert data["progress"]["current_period"]["end"] == "2026-11-05"
  assert data["progress"]["current_period"]["done"] == 1

  # O check-in posterior ao encerramento não deve entrar no progresso.
  assert data["progress"]["checked_today"] is False


def test_habit_statistics_uses_rolling_windows(
  client,
  auth_headers,
  habit_factory,
  check_in_factory,
  freeze_today,
):
  # Fixa a data para verificar as janelas móveis.
  freeze_today(date(2026, 11, 7))

  habit = habit_factory(name="Correr")

  # Registra check-ins dentro e fora das janelas móveis.
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 8)))
  check_in_factory(habit, created_at=at_noon(date(2026, 10, 9)))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 1)))
  check_in_factory(habit, created_at=at_noon(date(2026, 11, 7)))

  response = client.get(
    f"/user/statistics/habits/{habit.id}?mode=rolling&days=7",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()

  # Confere os totais das janelas móveis.
  assert data["check_ins"] == {
    "total": 4,
    "today": 1,
    "week": 2,
    "month": 3,
  }

  # Confere a série de sete dias, incluindo hoje.
  assert data["series"]["start"] == "2026-11-01"
  assert data["series"]["end"] == "2026-11-07"
  assert len(data["series"]["points"]) == 7
