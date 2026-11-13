from datetime import date

from sqlalchemy import event
from sqlmodel import Session

from app.goals.service import list_habits_with_progress
from app.habits.models import HabitStatus
from tests.conftest import at_noon
from tests.group.test_group_habits import (
  TODAY,
  _add_member,
  _make_group,
  _make_group_habit,
)


def test_list_mixes_personal_and_group_habits(
  client,
  test_engine,
  user,
  auth_headers,
  habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
):
  freeze_today(TODAY)
  personal = habit_factory(name="Pessoal")
  goal_factory(personal)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  group_habit = _make_group_habit(test_engine, group, name="De grupo")
  check_in_factory(group_habit, user=user, created_at=at_noon(date(2026, 11, 10)))

  response = client.get("/habits", headers=auth_headers)

  assert response.status_code == 200
  items = {item["id"]: item for item in response.json()}
  assert set(items) == {str(personal.id), str(group_habit.id)}
  assert items[str(personal.id)]["group"] is None
  assert items[str(group_habit.id)]["group"] == {
    "id": str(group.id),
    "name": "Grupo Teste",
  }
  assert items[str(group_habit.id)]["progress"]["current_streak"] == 1


def test_list_hides_habits_of_groups_the_user_does_not_belong_to(
  client, test_engine, user, auth_headers, other_user, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, other_user)
  _make_group_habit(test_engine, group)

  response = client.get("/habits", headers=auth_headers)

  assert response.json() == []


def test_list_status_filter_applies_to_group_habits(
  client, test_engine, user, auth_headers, freeze_today
):
  freeze_today(TODAY)
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  active = _make_group_habit(test_engine, group, name="Ativo")
  _make_group_habit(
    test_engine,
    group,
    name="Encerrado",
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 11, 5),
  )

  response = client.get("/habits?status=active", headers=auth_headers)

  assert [item["id"] for item in response.json()] == [str(active.id)]


def test_list_uses_a_fixed_number_of_queries(
  test_engine, user, habit_factory, goal_factory, freeze_today
):
  freeze_today(TODAY)

  def count(groups: int) -> int:
    for _ in range(groups):
      group = _make_group(test_engine)
      _add_member(test_engine, group, user)
      _make_group_habit(test_engine, group)
    statements: list[str] = []

    def before_execute(conn, cursor, statement, *args) -> None:
      statements.append(statement)

    event.listen(test_engine, "before_cursor_execute", before_execute)
    try:
      with Session(test_engine) as db:
        list_habits_with_progress(db, user)
    finally:
      event.remove(test_engine, "before_cursor_execute", before_execute)
    return len(statements)

  with_one_group = count(1)
  with_four_groups = count(3)  # acumula: 1 + 3 = 4 grupos

  assert with_one_group == with_four_groups
