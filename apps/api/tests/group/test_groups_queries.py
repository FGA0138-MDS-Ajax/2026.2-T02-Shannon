from datetime import date

import pytest

from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.fixtures import TODAY


@pytest.fixture
def build_group(
  test_engine,
  make_users,
  group_factory,
  member_factory,
  group_habit_factory,
  check_in_factory,
):
  """`build(members, habits) -> (grupo, hábitos, cabeçalhos do admin)`.

  Todo membro faz um check-in no primeiro hábito, para o feed e o ranking terem dados.
  """

  def build(members: int, habits: int):
    admin = _create_user(test_engine, "admin")
    group = group_factory(admin=admin)
    users = [admin]
    for member, _ in make_users(members - 1):
      member_factory(group, member)
      users.append(member)
    group_habits = [
      group_habit_factory(group, name=f"Hábito {i}") for i in range(habits)
    ]
    for index, member in enumerate(users):
      day = date(2026, 11, 2 + index % 8)
      check_in_factory(group_habits[0], user=member, created_at=at_noon(day))
    return group, group_habits, _auth_headers(admin)

  return build


def _queries_of(client, query_counter, url: str, headers) -> int:
  with query_counter() as statements:
    response = client.get(url, headers=headers)
  assert response.status_code == 200, response.text
  return len(statements)


@pytest.mark.parametrize("route", ["ranking", "habit_stats", "feed"])
def test_group_routes_use_the_same_queries_for_small_and_large_groups(
  client, query_counter, build_group, freeze_today, route
) -> None:
  freeze_today(TODAY)
  small, small_habits, small_headers = build_group(members=3, habits=1)
  large, large_habits, large_headers = build_group(members=30, habits=5)

  def url(group, habits) -> str:
    return {
      "ranking": f"/groups/{group.id}/ranking",
      "habit_stats": f"/groups/{group.id}/habits/{habits[0].id}/stats",
      "feed": f"/groups/{group.id}/check-ins",
    }[route]

  small_count = _queries_of(
    client, query_counter, url(small, small_habits), small_headers
  )
  large_count = _queries_of(
    client, query_counter, url(large, large_habits), large_headers
  )

  assert small_count == large_count


def test_list_habits_uses_the_same_queries_for_one_and_five_groups(
  client,
  test_engine,
  query_counter,
  group_factory,
  member_factory,
  group_habit_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)

  def user_in(groups: int):
    person = _create_user(test_engine, f"membro{groups}")
    for _ in range(groups):
      group = group_factory()
      member_factory(group, person)
      group_habit_factory(group)
    return _auth_headers(person)

  one = _queries_of(client, query_counter, "/habits", user_in(1))
  five = _queries_of(client, query_counter, "/habits", user_in(5))

  assert one == five
