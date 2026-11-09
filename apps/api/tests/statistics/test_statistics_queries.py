from collections.abc import Iterator
from datetime import date, timedelta

import pytest
from sqlalchemy import Engine, event

from tests.conftest import at_noon

TODAY = date(2026, 11, 2)


class QueryCounter:
  """Quantas instruções SQL passaram pelo engine desde o último `reset()`."""

  def __init__(self) -> None:
    self.count = 0

  def reset(self) -> None:
    self.count = 0


@pytest.fixture
def query_counter(test_engine: Engine) -> Iterator[QueryCounter]:
  """Conta as instruções do `test_engine` durante o teste e para de ouvir no fim."""
  counter = QueryCounter()

  def count_query(*_args) -> None:
    counter.count += 1

  event.listen(test_engine, "before_cursor_execute", count_query)
  try:
    yield counter
  finally:
    event.remove(test_engine, "before_cursor_execute", count_query)


def test_statistics_query_count_does_not_grow_with_habits(
  client,
  auth_headers,
  other_user,
  other_auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
  query_counter,
):
  # Garante que não há N+1: 1 hábito e 10 hábitos geram o mesmo número de SQL.
  freeze_today(TODAY)

  def arrange(author, habits_count: int) -> None:
    for index in range(habits_count):
      habit = habit_factory(author=author, name=f"Hábito {index}")
      goal_factory(habit)
      for offset in range(3):
        check_in_factory(habit, created_at=at_noon(TODAY - timedelta(offset)))

  arrange(None, 1)
  arrange(other_user, 10)

  query_counter.reset()
  one_habit = client.get("/user/statistics", headers=auth_headers)
  one_habit_queries = query_counter.count

  query_counter.reset()
  ten_habits = client.get("/user/statistics", headers=other_auth_headers)
  ten_habits_queries = query_counter.count

  assert one_habit.status_code == 200
  assert ten_habits.status_code == 200
  assert len(one_habit.json()["habit_progress"]) == 1
  assert len(ten_habits.json()["habit_progress"]) == 10
  assert one_habit_queries > 0
  assert one_habit_queries == ten_habits_queries
