from datetime import date, datetime, time
from uuid import uuid4

from sqlalchemy import Engine

from app.auth.models import User
from app.goals.models import Goal, GoalPeriod
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.habits.models import Habit, HabitCategory
from app.habits.service import APP_TIMEZONE
from tests.conftest import _save

# "Hoje" padrão dos testes de grupo: quarta-feira.
TODAY = date(2026, 11, 11)


def _sp(day: date, hour: int = 12, minute: int = 0) -> datetime:
  """Horário de São Paulo no dia dado.

  Sem `tzinfo` o banco interpreta o horário como UTC, por isso toda hora fora do
  meio-dia passa por aqui.
  """
  return datetime.combine(day, time(hour, minute), tzinfo=APP_TIMEZONE)


def _make_group(
  engine: Engine,
  *,
  name: str = "Grupo Teste",
  starts_on: date = date(2026, 10, 1),
  ends_on: date | None = None,
  ranking_criterion: RankingCriterion = RankingCriterion.CHECK_INS,
  admin: User | None = None,
) -> Group:
  """Cria um grupo direto no banco. Com `admin`, ele já entra como administrador."""
  group = _save(
    engine,
    Group(
      name=name,
      starts_on=starts_on,
      ends_on=ends_on,
      ranking_criterion=ranking_criterion,
      invite_code=uuid4().hex[:8].upper(),
    ),
  )
  if admin is not None:
    _add_member(engine, group, admin, role=GroupRole.ADMIN)
  return group


def _add_member(
  engine: Engine,
  group: Group,
  user: User,
  *,
  role: GroupRole = GroupRole.MEMBER,
  joined_at: datetime | None = None,
) -> Member:
  """Adiciona o usuário ao grupo. Sem `joined_at`, entra em 01/10 ao meio-dia."""
  return _save(
    engine,
    Member(
      group_id=group.id,
      user_id=user.id,
      role=role,
      joined_at=joined_at or _sp(date(2026, 10, 1)),
    ),
  )


def _make_group_habit(
  engine: Engine,
  group: Group,
  *,
  with_goal: bool = True,
  starts_on: date = date(2026, 11, 1),
  **fields,
) -> Habit:
  """Cria um hábito de grupo e, por padrão, a meta diária que começa em `starts_on`."""
  fields.setdefault("name", "Hábito do grupo")
  fields.setdefault("category", HabitCategory.CORRIDA)
  fields.setdefault("created_at", starts_on)
  habit = _save(engine, Habit(author_group_id=group.id, **fields))
  if with_goal:
    _save(
      engine,
      Goal(
        habit_id=habit.id,
        period=GoalPeriod.DAY,
        target_count=1,
        starts_on=starts_on,
      ),
    )
  return habit
