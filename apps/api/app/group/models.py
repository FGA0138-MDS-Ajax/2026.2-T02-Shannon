from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint
from sqlmodel import DateTime, Field, SQLModel, func


GROUP_MAX_MEMBERS = 30


class GroupRole(StrEnum):
  ADMIN = "admin"
  MEMBER = "member"


class RankingCriterion(StrEnum):
  CHECK_INS = "check_ins"
  GOALS = "goals"


class Group(SQLModel, table=True):
  __tablename__ = "groups"
  __table_args__ = (
    CheckConstraint(
      "ends_on IS NULL OR ends_on >= starts_on",
      name="ck_groups_period",
    ),
  )

  id: UUID = Field(default_factory=uuid4, primary_key=True)
  name: str = Field(max_length=100, nullable=False)
  description: str | None = Field(default=None, max_length=500, nullable=True)
  starts_on: date = Field(nullable=False)
  ends_on: date | None = Field(default=None, nullable=True)
  ranking_criterion: str = Field(max_length=20, nullable=False)
  invite_code: str = Field(max_length=8, unique=True, nullable=False)
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )


class Member(SQLModel, table=True):
  __tablename__ = "group_members"

  group_id: UUID = Field(
    foreign_key="groups.id",
    primary_key=True,
    ondelete="CASCADE",
  )
  user_id: UUID = Field(
    foreign_key="users.id",
    primary_key=True,
    ondelete="CASCADE",
    index=True,
  )
  role: str = Field(max_length=10, nullable=False)
  joined_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
