from uuid import UUID

from sqlmodel import Session, col, select

from app.checkins.models import CheckInHabit


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
