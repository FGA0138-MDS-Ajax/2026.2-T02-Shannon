from pydantic import Field

from app.checkins.schemas import GroupSummary
from app.habits.schemas import HabitCreate, HabitPublic, HabitUpdate

_IS_PUBLIC_IGNORED = "Ignorado: hábito de grupo é sempre visível só aos membros."


class GroupHabitCreate(HabitCreate):
  """Corpo do `POST /groups/{group_id}/habits`. A meta é obrigatória."""

  is_public: bool = Field(default=False, exclude=True, description=_IS_PUBLIC_IGNORED)


class GroupHabitUpdate(HabitUpdate):
  """Corpo do `PATCH /groups/{group_id}/habits/{habit_id}`.

  Muda nome, descrição, categoria e `target_end_date`. `goal` no corpo é ignorado
  (campo extra), como no hábito pessoal. `is_public` é aceito mas ignorado.
  """

  is_public: bool | None = Field(
    default=None, exclude=True, description=_IS_PUBLIC_IGNORED
  )


class GroupHabitPublic(HabitPublic):
  """Hábito de grupo devolvido pelas rotas, com o resumo do grupo."""

  group: GroupSummary
