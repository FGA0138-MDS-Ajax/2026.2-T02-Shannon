from datetime import date
from uuid import UUID

from sqlalchemy import Date, func
from sqlmodel import Session, col, select

from app.checkins.models import CheckIn
from app.goals.repository import APP_TIMEZONE_NAME


def _local_check_in_day():
  """Converte o timestamp para São Paulo antes de extrair o dia."""
  return func.date(
    func.timezone(APP_TIMEZONE_NAME, col(CheckIn.created_at)),
    type_=Date,
  )


def count_check_ins(
  db: Session,
  user_id: UUID,
  today: date,
  week_start: date,
  month_start: date,
) -> tuple[int, int, int, int]:
  """Retorna total histórico, hoje, semana e mês em uma consulta."""
  local_day = _local_check_in_day()

  statement = select(
    func.count(),
    func.count().filter(local_day == today),
    func.count().filter(local_day >= week_start, local_day <= today),
    func.count().filter(local_day >= month_start, local_day <= today),
  ).where(col(CheckIn.user_id) == user_id)

  total, today_count, week_count, month_count = db.exec(statement).one()

  return (
    int(total),
    int(today_count),
    int(week_count),
    int(month_count),
  )


def count_check_ins_by_day(
  db: Session,
  user_id: UUID,
  start: date,
  end: date,
) -> dict[date, int]:
  """Conta check-ins por dia no intervalo, sem preencher dias zerados."""
  local_day = _local_check_in_day()

  statement = (
    select(local_day, func.count())
    .where(
      col(CheckIn.user_id) == user_id,
      local_day >= start,
      local_day <= end,
    )
    .group_by(local_day)
    .order_by(local_day)
  )

  return {day: int(count) for day, count in db.exec(statement).all()}


def list_user_check_in_days(db: Session, user_id: UUID) -> set[date]:
  """Retorna os dias distintos com check-in no histórico do usuário."""
  local_day = _local_check_in_day()

  statement = select(local_day).distinct().where(col(CheckIn.user_id) == user_id)

  return set(db.exec(statement).all())
