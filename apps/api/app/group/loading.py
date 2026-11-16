from datetime import date
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.goals import repository as goals_repository
from app.group import repository
from app.group.models import Member
from app.habits import repository as habits_repository
from app.habits.models import Habit


def load_group_data(
  db: Session, group_id: UUID
) -> tuple[
  list[Habit],
  list[tuple[Member, User]],
  dict[tuple[UUID, UUID], set[date]],
]:
  """Carga comum do ranking e das estatísticas do grupo. Não faz commit.

  Devolve `(hábitos, membros, dias)`: os hábitos do grupo que têm meta (ativos e
  encerrados, com a meta já carregada), os membros atuais com seus usuários e os
  dias de check-in por `(habit_id, user_id)`. Faz um número fixo de consultas,
  seja qual for o tamanho do grupo. Quem não tem check-in não aparece em `days`:
  use `days.get((habit.id, user_id), set())`.
  """
  habits = [
    habit
    for habit in habits_repository.list_habits_by_group(db, group_id)
    if habit.goal is not None
  ]
  members = repository.list_members_with_users(db, group_id)
  days = goals_repository.list_check_in_days_by_member(
    db, [habit.id for habit in habits], [member.user_id for member, _ in members]
  )
  return habits, members, days
