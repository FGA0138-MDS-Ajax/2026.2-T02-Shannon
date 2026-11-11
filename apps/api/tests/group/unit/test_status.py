from datetime import date

from app.group.models import Group, RankingCriterion
from app.group.status import group_status


def _make_group(*, ends_on: date | None) -> Group:
  return Group(
    name="Grupo Teste",
    starts_on=date(2026, 11, 1),
    ends_on=ends_on,
    ranking_criterion=RankingCriterion.CHECK_INS,
    invite_code="TEST1234",
  )


def test_group_status_without_ends_on_is_active() -> None:
  group = _make_group(ends_on=None)

  assert group_status(group, date(2026, 11, 10)) == "active"


def test_group_status_with_ends_on_today_is_active() -> None:
  today = date(2026, 11, 10)
  group = _make_group(ends_on=today)

  assert group_status(group, today) == "active"


def test_group_status_with_ends_on_yesterday_is_ended() -> None:
  group = _make_group(ends_on=date(2026, 11, 9))

  assert group_status(group, date(2026, 11, 10)) == "ended"


def test_group_status_with_ends_on_future_is_active() -> None:
  group = _make_group(ends_on=date(2026, 11, 11))

  assert group_status(group, date(2026, 11, 10)) == "active"
