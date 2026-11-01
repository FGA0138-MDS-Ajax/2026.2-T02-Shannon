from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlmodel import Session, col, select

from app.checkins.models import CheckIn, CheckInHabit

APP_TIMEZONE_NAME = "America/Sao_Paulo"


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


def get_check_in_by_id(db: Session, check_in_id: UUID) -> CheckIn | None:
  """Busca o check-in pelo id. Não faz commit."""
  return db.get(CheckIn, check_in_id)


def update_check_in(db: Session, check_in: CheckIn, fields: dict[str, Any]) -> CheckIn:
  """Aplica os campos ao check-in e faz flush. Não faz commit."""
  check_in.sqlmodel_update(fields)
  db.add(check_in)
  db.flush()
  return check_in


def delete_check_in(db: Session, check_in: CheckIn) -> None:
  """Exclui o check-in e faz flush; os vínculos saem em cascata. Não faz commit."""
  db.delete(check_in)
  db.flush()


def list_check_ins_by_habit(db: Session, habit_id: UUID) -> list[CheckIn]:
  """Lista os check-ins ligados ao hábito, do mais recente ao mais antigo.

  O `id` desempata check-ins com o mesmo `created_at`. Não faz commit.
  """
  statement = (
    select(CheckIn)
    .join(CheckInHabit, col(CheckInHabit.check_in_id) == col(CheckIn.id))
    .where(col(CheckInHabit.habit_id) == habit_id)
    .order_by(col(CheckIn.created_at).desc(), col(CheckIn.id))
  )
  return list(db.exec(statement).all())


def list_user_check_ins_grouped_by_day(
  db: Session,
  user_id: UUID,
  limit: int,
  offset: int,
) -> list[tuple[date, list[dict[str, Any]]]]:
  """Consulta check-ins do usuário agrupados por dia (São Paulo) no PostgreSQL.

  Aplica paginação por dias distintos. Não faz commit.
  """
  statement = text(
    """
    WITH paged_days AS (
      SELECT DISTINCT DATE(TIMEZONE(:tz, created_at)) AS day
      FROM check_ins
      WHERE user_id = :user_id
      ORDER BY day DESC
      LIMIT :limit OFFSET :offset
    ),
    check_in_data AS (
      SELECT
        c.id,
        c.user_id,
        c.title,
        c.description,
        c.created_at,
        c.duration,
        d.day,
        COALESCE(
          JSON_AGG(h.habit_id) FILTER (WHERE h.habit_id IS NOT NULL),
          '[]'::json
        ) AS habit_ids
      FROM paged_days d
      JOIN check_ins c ON c.user_id = :user_id
        AND DATE(TIMEZONE(:tz, c.created_at)) = d.day
      LEFT JOIN check_in_habits h ON h.check_in_id = c.id
      GROUP BY c.id, d.day
    )
    SELECT
      d.day,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', cd.id,
          'user_id', cd.user_id,
          'title', cd.title,
          'description', cd.description,
          'created_at', cd.created_at,
          'duration', cd.duration,
          'habit_ids', cd.habit_ids
        ) ORDER BY cd.created_at DESC, cd.id
      ) AS check_ins
    FROM paged_days d
    JOIN check_in_data cd ON cd.day = d.day
    GROUP BY d.day
    ORDER BY d.day DESC;
    """
  )
  result = db.exec(
    statement.params(
      tz=APP_TIMEZONE_NAME,
      user_id=user_id,
      limit=limit,
      offset=offset,
    )
  ).all()
  return [(row[0], row[1]) for row in result]
