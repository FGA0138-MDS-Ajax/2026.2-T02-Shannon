from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

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
