from datetime import UTC, datetime
from uuid import uuid4

from app.group.members import choose_successor
from app.group.models import GroupRole, Member


def test_choose_successor_selects_oldest_joined_at() -> None:
  group_id = uuid4()
  leaving_id = uuid4()
  m1_id = uuid4()
  m2_id = uuid4()

  m_leaving = Member(
    group_id=group_id,
    user_id=leaving_id,
    role=GroupRole.ADMIN.value,
    joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=UTC),
  )
  m1 = Member(
    group_id=group_id,
    user_id=m1_id,
    role=GroupRole.MEMBER.value,
    joined_at=datetime(2026, 11, 2, 10, 0, tzinfo=UTC),
  )
  m2 = Member(
    group_id=group_id,
    user_id=m2_id,
    role=GroupRole.MEMBER.value,
    joined_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
  )

  successor = choose_successor([m_leaving, m1, m2], leaving_id)
  assert successor is not None
  assert successor.user_id == m1_id


def test_choose_successor_tie_breaks_by_user_id() -> None:
  group_id = uuid4()
  leaving_id = uuid4()
  user_a = uuid4()
  user_b = uuid4()
  first_id, second_id = sorted([user_a, user_b])

  shared_time = datetime(2026, 11, 2, 10, 0, tzinfo=UTC)
  m_a = Member(
    group_id=group_id,
    user_id=second_id,
    role=GroupRole.MEMBER.value,
    joined_at=shared_time,
  )
  m_b = Member(
    group_id=group_id,
    user_id=first_id,
    role=GroupRole.MEMBER.value,
    joined_at=shared_time,
  )

  successor = choose_successor([m_a, m_b], leaving_id)
  assert successor is not None
  assert successor.user_id == first_id


def test_choose_successor_returns_none_when_empty_or_only_leaving() -> None:
  leaving_id = uuid4()
  m_leaving = Member(
    group_id=uuid4(),
    user_id=leaving_id,
    role=GroupRole.ADMIN.value,
    joined_at=datetime(2026, 11, 1, 10, 0, tzinfo=UTC),
  )

  assert choose_successor([], leaving_id) is None
  assert choose_successor([m_leaving], leaving_id) is None
