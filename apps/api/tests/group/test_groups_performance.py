import os
import statistics
import time
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.group.conftest import create_group_history
from tests.group.fixtures import TODAY, _sp

MEMBERS = 30
HABITS = 5
START = date(2026, 5, 11)
RUNS = 20
TARGET_P95_MS = 500


def _p95(samples: list[float]) -> float:
  ordered = sorted(samples)
  return ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]


@pytest.mark.skipif(
  not os.getenv("RUN_PERF"), reason="medição de desempenho: defina RUN_PERF=1"
)
def test_group_response_time(
  client: TestClient,
  auth_headers: dict[str, str],
  test_engine: Engine,
  user,
  make_users,
  group_factory,
  member_factory,
  group_habit_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  joined = _sp(START)
  group = group_factory(admin=user, starts_on=START)
  members = [user]
  for member, _ in make_users(MEMBERS - 1):
    member_factory(group, member, joined_at=joined)
    members.append(member)
  habits = [
    group_habit_factory(group, name=f"Hábito {i}", starts_on=START)
    for i in range(HABITS)
  ]
  create_group_history(test_engine, habits, members, START, TODAY)

  routes = {
    "ranking": f"/groups/{group.id}/ranking",
    "stats (hábito)": f"/groups/{group.id}/habits/{habits[0].id}/stats",
    "feed": f"/groups/{group.id}/check-ins?limit=20",
  }
  print(f"\n{MEMBERS} membros, {HABITS} hábitos, {(TODAY - START).days + 1} dias")
  for name, url in routes.items():
    samples: list[float] = []
    for _ in range(RUNS):
      started = time.perf_counter()
      response = client.get(url, headers=auth_headers)
      samples.append((time.perf_counter() - started) * 1000)
      assert response.status_code == 200
    print(
      f"{name:16} média {statistics.mean(samples):7.1f} ms | "
      f"P95 {_p95(samples):7.1f} ms | meta {TARGET_P95_MS} ms"
    )
