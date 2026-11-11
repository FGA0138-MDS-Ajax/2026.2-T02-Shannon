from datetime import date
from enum import StrEnum
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
  from app.goals.models import Goal


class HabitStatus(StrEnum):
  ACTIVE = "active"
  FINISHED = "finished"


class HabitCategory(StrEnum):
  """Categorias fixas de hábito. A coluna é VARCHAR, sem ENUM nativo no banco.

  A ordem é a de exibição: `outros` fica por último.
  """

  MUSCULACAO = "musculacao"
  CORRIDA = "corrida"
  CICLISMO = "ciclismo"
  NATACAO = "natacao"
  CARDIO = "cardio"
  ESPORTES = "esportes"
  ALIMENTACAO = "alimentacao"
  SONO = "sono"
  ESTUDOS = "estudos"
  LEITURA = "leitura"
  MENTE = "mente"
  RELIGIAO = "religiao"
  PRODUTIVIDADE = "produtividade"
  FINANCAS = "financas"
  ARTE = "arte"
  OUTROS = "outros"


STATUS_FINISHED_AT_CHECK = (
  f"(status = '{HabitStatus.ACTIVE.name}' AND finished_at IS NULL) OR "
  f"(status = '{HabitStatus.FINISHED.name}' AND finished_at IS NOT NULL)"
)

SINGLE_AUTHOR_CHECK = "(author_user_id IS NULL) <> (author_group_id IS NULL)"


class Habit(SQLModel, table=True):
  __tablename__ = "habits"
  __table_args__ = (
    CheckConstraint(STATUS_FINISHED_AT_CHECK, name="ck_habits_status_finished_at"),
    CheckConstraint(SINGLE_AUTHOR_CHECK, name="ck_habits_single_author"),
  )

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  name: str = Field(max_length=100, nullable=False)
  description: str | None = Field(max_length=500, nullable=True, default=None)
  category: str = Field(max_length=50, nullable=False)
  is_public: bool = Field(default=False, nullable=False)
  status: HabitStatus = Field(default=HabitStatus.ACTIVE, nullable=False, index=True)
  author_user_id: UUID | None = Field(
    default=None,
    foreign_key="users.id",
    nullable=True,
    ondelete="CASCADE",
    index=True,
  )
  author_group_id: UUID | None = Field(
    default=None,
    foreign_key="groups.id",
    nullable=True,
    ondelete="CASCADE",
    index=True,
  )
  created_at: date = Field(nullable=False)
  target_end_date: date | None = Field(default=None)
  finished_at: date | None = Field(default=None)

  goal: Optional["Goal"] = Relationship(
    back_populates="habit",
    cascade_delete=True,
    sa_relationship_kwargs={"lazy": "selectin"},
  )
