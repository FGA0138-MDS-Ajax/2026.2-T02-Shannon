from datetime import timedelta
from uuid import UUID

from sqlmodel import Session, col, select

from app.checkins.models import CheckIn, CheckInHabit


def list_habit_links(db: Session, check_in_ids: list[UUID]) -> list[CheckInHabit]:
  """Busca os vínculos de vários check-ins numa consulta só, com IN.

  Lista vazia devolve `[]` sem consultar. Não faz commit.
  """
  if not check_in_ids:
    return []
  statement = select(CheckInHabit).where(
    col(CheckInHabit.check_in_id).in_(check_in_ids)
  )
  return list(db.exec(statement).all())


def create_check_in(
  db: Session,
  user_id: UUID,
  title: str,
  description: str | None,
  duration: timedelta | None,
  habit_ids: list[UUID],
) -> CheckIn:
  """Adiciona o check-in e um vínculo por hábito. Não faz commit.

  O `flush` envia o INSERT do check-in antes dos vínculos, que apontam para ele.
  """
  check_in = CheckIn(
    user_id=user_id, title=title, description=description, duration=duration
  )
  db.add(check_in)
  db.flush()
  db.add_all(
    CheckInHabit(check_in_id=check_in.id, habit_id=habit_id) for habit_id in habit_ids
  )
  return check_in
