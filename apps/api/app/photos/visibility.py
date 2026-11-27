"""Regra de quem pode ver a foto de um check-in (FOTO-6). Função pura, sem banco."""

from collections.abc import Sequence
from collections.abc import Set as AbstractSet
from uuid import UUID

from app.habits.models import Habit


def can_view_photo(
  author_id: UUID,
  habits: Sequence[Habit],
  viewer_id: UUID,
  viewer_group_ids: AbstractSet[UUID],
) -> bool:
  """Diz se `viewer_id` pode ver a foto de um check-in de `author_id`.

  Vale para o autor e para quem é membro de um grupo dono de algum hábito do
  check-in (informe todos os hábitos, não só os que vão na resposta). Hábito
  pessoal público de outra pessoa não dá acesso à foto.
  """
  if viewer_id == author_id:
    return True
  return any(
    habit.author_group_id is not None and habit.author_group_id in viewer_group_ids
    for habit in habits
  )
