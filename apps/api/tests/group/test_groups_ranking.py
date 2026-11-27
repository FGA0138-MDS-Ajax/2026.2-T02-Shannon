from datetime import date

from fastapi.testclient import TestClient

from app.goals.models import GoalPeriod
from app.habits.models import HabitStatus
from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.fixtures import TODAY, _sp


def _ranking(client: TestClient, group, headers) -> dict:
  response = client.get(f"/groups/{group.id}/ranking", headers=headers)
  assert response.status_code == 200, response.text
  return response.json()


def _rows(ranking: dict) -> list[tuple[int, str, int]]:
  """`(posição, nome sem sufixo, pontuação)` na ordem devolvida."""
  return [
    (item["position"], item["user"]["username"].split("_")[0], item["score"])
    for item in ranking["items"]
  ]


def test_ranking_by_check_ins_and_then_by_goals(
  client: TestClient,
  test_engine,
  user,
  auth_headers,
  group_factory,
  member_factory,
  group_habit_factory,
  goal_factory,
  check_in_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  davi = user
  ana, bia, caio = (_create_user(test_engine, n) for n in ("ana", "bia", "caio"))
  for member in (ana, bia, caio):
    member_factory(group, member)
  habit = group_habit_factory(group, with_goal=False, starts_on=date(2026, 11, 2))
  goal_factory(
    habit,
    period=GoalPeriod.WEEK,
    target_count=2,
    period_end_weekday=7,
    starts_on=date(2026, 11, 2),
  )

  def check_in(who, *days: int) -> None:
    for day in days:
      check_in_factory(habit, user=who, created_at=at_noon(date(2026, 11, day)))

  check_in(ana, 2, 2, 3, 9)
  check_in(bia, 9, 10)
  check_in(caio, 2, 9)
  check_in(davi, 4)

  by_check_ins = _ranking(client, group, _auth_headers(bia))

  assert by_check_ins["criterion"] == "check_ins"
  assert by_check_ins["as_of"] == TODAY.isoformat()
  assert _rows(by_check_ins) == [
    (1, "ana", 3),
    (2, "bia", 2),
    (2, "caio", 2),
    (4, "usuario", 1),
  ]
  assert by_check_ins["me"] == {"position": 2, "score": 2}

  response = client.patch(
    f"/groups/{group.id}", json={"ranking_criterion": "goals"}, headers=auth_headers
  )
  assert response.status_code == 200

  by_goals = _ranking(client, group, _auth_headers(bia))

  assert by_goals["criterion"] == "goals"
  assert _rows(by_goals) == [
    (1, "ana", 1),
    (1, "bia", 1),
    (3, "caio", 0),
    (3, "usuario", 0),
  ]
  assert by_goals["me"] == {"position": 1, "score": 1}


def test_ranking_without_check_ins_puts_everyone_first_with_zero(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  group_factory,
  member_factory,
  group_habit_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  member_factory(group, other_user)
  group_habit_factory(group)

  ranking = _ranking(client, group, auth_headers)

  assert [(i["position"], i["score"]) for i in ranking["items"]] == [(1, 0), (1, 0)]
  assert ranking["me"] == {"position": 1, "score": 0}


def test_ranking_counts_only_from_the_day_the_member_joined(
  client: TestClient,
  user,
  other_user,
  auth_headers,
  group_factory,
  member_factory,
  group_habit_factory,
  check_in_factory,
  freeze_today,
) -> None:
  freeze_today(TODAY)
  group = group_factory(admin=user)
  member_factory(group, other_user, joined_at=_sp(date(2026, 11, 6), 9))
  habit = group_habit_factory(group)
  for day in (4, 7):
    check_in_factory(habit, user=other_user, created_at=at_noon(date(2026, 11, day)))

  ranking = _ranking(client, group, auth_headers)

  scores = {i["user"]["id"]: i["score"] for i in ranking["items"]}
  assert scores[str(other_user.id)] == 1


def test_ended_group_ranking_is_frozen_until_end_is_extended(
  client: TestClient,
  user,
  auth_headers,
  group_factory,
  group_habit_factory,
  check_in_factory,
  freeze_today,
) -> None:
  freeze_today(date(2026, 10, 27))
  group = group_factory(admin=user, ends_on=date(2026, 10, 20))
  habit = group_habit_factory(group, starts_on=date(2026, 10, 1))
  finished = group_habit_factory(
    group,
    name="Encerrado",
    starts_on=date(2026, 10, 1),
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 10, 10),
  )
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 10, 19)))
  check_in_factory(habit, user=user, created_at=at_noon(date(2026, 10, 22)))
  check_in_factory(finished, user=user, created_at=at_noon(date(2026, 10, 5)))

  frozen = _ranking(client, group, auth_headers)

  assert frozen["as_of"] == "2026-10-20"
  assert frozen["me"] == {"position": 1, "score": 2}

  response = client.patch(
    f"/groups/{group.id}", json={"ends_on": None}, headers=auth_headers
  )
  assert response.status_code == 200

  thawed = _ranking(client, group, auth_headers)

  assert thawed["as_of"] == "2026-10-27"
  assert thawed["me"]["score"] == 3


def test_finished_habit_keeps_what_it_accumulated_by_goals(
  client: TestClient,
  user,
  auth_headers,
  group_factory,
  group_habit_factory,
  check_in_factory,
  freeze_today,
) -> None:
  freeze_today(date(2026, 10, 27))
  group = group_factory(
    admin=user, ranking_criterion="goals", ends_on=date(2026, 10, 20)
  )
  finished = group_habit_factory(
    group,
    starts_on=date(2026, 10, 1),
    status=HabitStatus.FINISHED,
    finished_at=date(2026, 10, 10),
  )
  check_in_factory(finished, user=user, created_at=at_noon(date(2026, 10, 5)))
  check_in_factory(finished, user=user, created_at=at_noon(date(2026, 10, 12)))

  ranking = _ranking(client, group, auth_headers)

  assert ranking["me"] == {"position": 1, "score": 1}
