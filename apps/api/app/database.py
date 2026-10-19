from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

from app.auth import models as auth_models  # noqa: F401  registra User no metadata
from app.check_ins import (
  models as check_ins_models,  # noqa: F401  registra CheckIn no metadata
)
from app.config import settings
from app.habit import models as habit_models  # noqa: F401  registra Habit no metadata

engine = create_engine(
  settings.database_url_sync,
  echo=False,
)


def create_db_and_tables() -> None:
  SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session]:
  with Session(engine) as session:
    yield session


SessionDep = Annotated[Session, Depends(get_session)]
