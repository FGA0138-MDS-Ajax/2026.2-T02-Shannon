import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session, select

from app.group.exceptions import AlreadyAdminError, GroupFullError
from app.group.invite import service_join_group
from app.group.members import service_leave_group, service_promote_member
from app.group.models import GROUP_MAX_MEMBERS, Group, GroupRole, Member
from app.group.schemas import JoinRequest


def _race(test_engine, *calls: Callable[[Session], object]) -> list[object]:
  """Roda cada chamada em uma thread com sessão própria; devolve resultado ou erro."""
  barrier = threading.Barrier(len(calls))

  def run(call: Callable[[Session], object]) -> object:
    with Session(test_engine) as db:
      barrier.wait(timeout=10)
      try:
        return call(db)
      except Exception as error:
        return error

  with ThreadPoolExecutor(max_workers=len(calls)) as pool:
    return list(pool.map(run, calls))


def _members(test_engine, group: Group) -> list[Member]:
  with Session(test_engine) as db:
    return list(db.exec(select(Member).where(Member.group_id == group.id)).all())


def test_two_admins_leaving_at_once_leave_exactly_one_admin(
  test_engine, user, other_user, make_users, group_factory, member_factory
) -> None:
  group = group_factory(admin=user)
  member_factory(group, other_user, GroupRole.ADMIN)
  ((plain, _),) = make_users(1)
  member_factory(group, plain)

  results = _race(
    test_engine,
    lambda db: service_leave_group(db, group.id, user),
    lambda db: service_leave_group(db, group.id, other_user),
  )

  assert all(not isinstance(result, Exception) for result in results), results
  remaining = _members(test_engine, group)
  assert [m.user_id for m in remaining] == [plain.id]
  assert [m.role for m in remaining] == [GroupRole.ADMIN]


def test_two_joins_for_the_last_seat_leave_exactly_30_members(
  test_engine, user, make_users, group_factory, member_factory
) -> None:
  group = group_factory(admin=user)
  for member, _ in make_users(GROUP_MAX_MEMBERS - 2):
    member_factory(group, member)  # 29 membros, falta uma vaga
  (first, _), (second, _) = make_users(2, prefix="candidato")
  join = JoinRequest(code=group.invite_code)

  results = _race(
    test_engine,
    lambda db: service_join_group(db, first, join),
    lambda db: service_join_group(db, second, join),
  )

  errors = [r for r in results if isinstance(r, Exception)]
  assert len(errors) == 1 and isinstance(errors[0], GroupFullError), results
  assert len(_members(test_engine, group)) == GROUP_MAX_MEMBERS


def test_two_promotions_of_the_same_member_give_one_success_and_one_conflict(
  test_engine, user, other_user, make_users, group_factory, member_factory
) -> None:
  group = group_factory(admin=user)
  member_factory(group, other_user, GroupRole.ADMIN)
  ((target, _),) = make_users(1)
  member_factory(group, target)

  results = _race(
    test_engine,
    lambda db: service_promote_member(db, group.id, target.id, user),
    lambda db: service_promote_member(db, group.id, target.id, other_user),
  )

  errors = [r for r in results if isinstance(r, Exception)]
  assert len(errors) == 1 and isinstance(errors[0], AlreadyAdminError), results
