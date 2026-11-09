from datetime import date
from uuid import uuid4

import pytest

TODAY = date(2026, 11, 2)


def test_statistics_routes_require_token(client):
  # Garante que as duas rotas de estatísticas exigem autenticação.
  overview = client.get("/user/statistics")
  calendar = client.get(f"/user/statistics/habits/{uuid4()}/calendar")

  assert overview.status_code == 401
  assert calendar.status_code == 401


def test_statistics_without_data_returns_zeros(client, auth_headers, freeze_today):
  # Garante que um usuário novo recebe tudo zerado, sem erro e com a série cheia.
  freeze_today(TODAY)

  response = client.get("/user/statistics", headers=auth_headers)

  assert response.status_code == 200
  data = response.json()
  assert data["reference_date"] == "2026-11-02"
  assert data["timezone"] == "America/Sao_Paulo"
  assert data["mode"] == "calendar"
  assert data["habits"] == {"total": 0, "active": 0, "finished": 0}
  assert data["check_ins"] == {"total": 0, "today": 0, "week": 0, "month": 0}
  assert data["completed_habits"] == {"today": 0, "week": 0, "month": 0}
  assert data["goal_completion"] == {
    "completed_periods": 0,
    "total_periods": 0,
    "rate": pytest.approx(0.0),
    "days": 30,
  }
  assert data["activity_streak"] == {"current": 0, "best": 0}
  assert data["at_risk"] == {"count": 0, "habit_ids": []}
  assert data["habit_progress"] == []
  assert data["series"]["start"] == "2026-10-04"
  assert data["series"]["end"] == "2026-11-02"
  assert len(data["series"]["points"]) == 30
  assert all(point["count"] == 0 for point in data["series"]["points"])


@pytest.mark.parametrize("days", [1, 365])
def test_statistics_series_has_one_point_per_requested_day(
  client, auth_headers, freeze_today, days
):
  # Garante que os limites aceitos de `days` geram exatamente `days` pontos.
  freeze_today(TODAY)

  response = client.get("/user/statistics", headers=auth_headers, params={"days": days})

  assert response.status_code == 200
  points = response.json()["series"]["points"]
  assert len(points) == days
  assert points[-1]["date"] == "2026-11-02"


@pytest.mark.parametrize(
  "params",
  [{"days": 0}, {"days": 366}, {"mode": "semana"}],
)
def test_statistics_rejects_invalid_query(client, auth_headers, freeze_today, params):
  # Garante que `days` fora de 1..365 e `mode` desconhecido devolvem 422.
  freeze_today(TODAY)

  response = client.get("/user/statistics", headers=auth_headers, params=params)

  assert response.status_code == 422
