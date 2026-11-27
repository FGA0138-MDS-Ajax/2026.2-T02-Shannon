from datetime import datetime
from uuid import UUID

from sqlmodel import DateTime, Field, SQLModel, func


class CheckInPhoto(SQLModel, table=True):
  """Foto de um check-in, no máximo uma por check-in.

  Guarda só as chaves dos objetos no bucket; os bytes ficam no armazenamento. A
  PK é o próprio `check_in_id`, então o banco recusa uma segunda foto para o mesmo
  check-in, e apagar o check-in apaga a linha (`ON DELETE CASCADE`).
  """

  __tablename__ = "check_in_photos"

  check_in_id: UUID = Field(
    foreign_key="check_ins.id", primary_key=True, ondelete="CASCADE"
  )
  full_key: str = Field(max_length=255, nullable=False)
  thumbnail_key: str = Field(max_length=255, nullable=False)
  created_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
  # Também começa com `now()`; `upsert_photo` atualiza a cada substituição.
  updated_at: datetime | None = Field(
    default=None,
    sa_type=DateTime(timezone=True),
    sa_column_kwargs={"server_default": func.now()},
    nullable=False,
  )
