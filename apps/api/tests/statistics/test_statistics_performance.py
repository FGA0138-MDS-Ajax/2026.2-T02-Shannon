"""Medição 13: tempo das estatísticas com 2 anos de histórico. Fora do CI.

Rodar no PowerShell:
  $env:RUN_PERF=1; uv run pytest tests/statistics/test_statistics_performance.py -s
"""

import os
from datetime import date, timedelta
from time import perf_counter
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, insert
from sqlmodel import Session

from app.checkins.models import CheckIn, CheckInHabit
from app.habits.models import Habit
from tests.conftest import at_noon

TODAY = date(2026, 11, 2)
REPEAT = 5

pytestmark = pytest.mark.skipif(
  not os.getenv("RUN_PERF"),
  reason="Medição de desempenho: defina RUN_PERF=1 para rodar.",
)


def create_history(engine: Engine, habits: list[Habit], start: date, end: date) -> None:
  """Grava um check-in por dia, por hábito, de `start` a `end`, num commit só."""
  check_ins = []
  links = []
  day = start
  while day <= end:
    for habit in habits:
      check_in_id = uuid4()
      check_ins.append(
        {
          "id": check_in_id,
          "user_id": habit.author_user_id,
          "title": "Check-in histórico",
          "created_at": at_noon(day),
        }
      )
      links.append({"check_in_id": check_in_id, "habit_id": habit.id})
    day += timedelta(days=1)

  with Session(engine) as session:
    session.execute(insert(CheckIn), check_ins)
    session.execute(insert(CheckInHabit), links)
    session.commit()


def _measure(client: TestClient, url: str, headers: dict[str, str]) -> list[float]:
  """Tempo, em milissegundos, de `REPEAT` chamadas seguidas à rota."""
  times = []
  for _ in range(REPEAT):
    started = perf_counter()
    response = client.get(url, headers=headers)
    times.append((perf_counter() - started) * 1000)
    assert response.status_code == 200
  return times


def test_statistics_response_time(
  client: TestClient,
  auth_headers: dict[str, str],
  test_engine: Engine,
  habit_factory,
  goal_factory,
  freeze_today,
) -> None:
  # Mede (sem assert de tempo) as estatísticas e o calendário com 2 anos de dados.
  freeze_today(TODAY)
  habits = []
  for index in range(5):
    habit = habit_factory(name=f"Hábito {index}")
    goal_factory(habit)
    habits.append(habit)
  create_history(test_engine, habits, TODAY - timedelta(days=729), TODAY)

  results = {
    "GET /user/statistics": _measure(client, "/user/statistics", auth_headers),
    "GET /user/statistics?days=365": _measure(
      client, "/user/statistics?days=365", auth_headers
    ),
    "GET .../calendar": _measure(
      client, f"/user/statistics/habits/{habits[0].id}/calendar", auth_headers
    ),
  }

  print(f"\n5 hábitos, 730 dias, {5 * 730} check-ins; {REPEAT} chamadas por rota")
  for route, times in results.items():
    print(
      f"{route}: mín {min(times):.1f} ms | média {sum(times) / len(times):.1f} ms"
      f" | máx {max(times):.1f} ms"
    )
