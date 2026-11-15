from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals import repository as goals_repository
from app.goals.schemas import GoalPublic, HabitProgressPublic
from app.group import repository
from app.group.exceptions import MSG_GROUP_NOT_FOUND, GroupNotFoundError
from app.group.habits import build_members_progress, get_habit_of_group
from app.group.permissions import require_member
from app.group.responses import RESPONSES_GROUP_HABIT_STATS
from app.group.schemas import (
  GroupHabitStatistics,
  MemberHabitStats,
  RankingUser,
)
from app.group.status import group_reference_date
from app.habits import service as habits_service
from app.habits.exceptions import MSG_HABIT_NOT_FOUND, HabitNotFoundError

stats_router = APIRouter(prefix="/groups", tags=["groups"])


def get_group_habit_statistics(
  db: Session,
  group_id: UUID,
  habit_id: UUID,
  user: User,
) -> GroupHabitStatistics:
  """Estatísticas de um hábito do grupo por integrante atual.

  Só membros do grupo acessam; hábito de outro grupo ou inexistente levanta
  `HabitNotFoundError` (404). `as_of` é hoje ou o `ends_on` do grupo, o que vier
  primeiro. Hábito sem meta devolve lista vazia de membros.

  Faz um número fixo de consultas (grupo/permissão, hábito com meta, membros e
  dias de check-in em lote).
  """
  group, _ = require_member(db, group_id, user)
  habit = get_habit_of_group(db, group_id, habit_id)

  today = habits_service.today()
  as_of = today if group.ends_on is None else min(today, group.ends_on)

  if habit.goal is None:
    return GroupHabitStatistics(
      as_of=as_of,
      habit_id=habit.id,
      name=habit.name,
      habit_status=habit.status,
      members=[],
    )

  members = repository.list_members_with_users(db, group_id)
  user_ids = [member.user_id for member, _ in members]
  days = goals_repository.list_check_in_days_by_member(db, [habit.id], user_ids)
  progress_by_member = build_members_progress(
    db, group, [habit], user_ids, today, days=days
  )

  reference = group_reference_date(group, habit, today)
  goal_public = GoalPublic.model_validate(habit.goal)

  stats: list[MemberHabitStats] = []
  for member, member_user in members:
    progress = progress_by_member[(habit.id, member.user_id)]
    member_days = days.get((habit.id, member.user_id), set())
    check_in_days = sum(day <= reference for day in member_days)
    stats.append(
      MemberHabitStats(
        user=RankingUser(id=member.user_id, username=member_user.username),
        progress=HabitProgressPublic(
          habit_id=habit.id,
          goal=goal_public,
          **progress.model_dump(),
        ),
        check_in_days=check_in_days,
      )
    )

  stats.sort(key=lambda item: (-item.progress.current_streak, item.user.username))
  return GroupHabitStatistics(
    as_of=as_of,
    habit_id=habit.id,
    name=habit.name,
    habit_status=habit.status,
    members=stats,
  )


@stats_router.get(
  "/{group_id}/habits/{habit_id}/stats",
  response_model=GroupHabitStatistics,
  status_code=status.HTTP_200_OK,
  summary="Estatísticas de um hábito por integrante",
  description=(
    "Devolve o progresso na meta e a contagem de dias com check-in de cada"
    " integrante atual em um hábito do grupo, ordenados pelo maior"
    " `current_streak` e desempate alfabético por `username`. Só **membros**"
    " acessam. Membro sem check-in aparece com zeros e cada um conta a partir da"
    " própria entrada no grupo. Em grupo encerrado, `as_of` e os números ficam"
    " congelados no `ends_on`. Hábito sem meta devolve `members` vazio."
  ),
  responses=RESPONSES_GROUP_HABIT_STATS,
)
def get_habit_stats(
  db: SessionDep,
  group_id: UUID,
  habit_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupHabitStatistics:
  """Devolve as estatísticas de um hábito do grupo por integrante."""
  try:
    return get_group_habit_statistics(db, group_id, habit_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
  except HabitNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND) from None
