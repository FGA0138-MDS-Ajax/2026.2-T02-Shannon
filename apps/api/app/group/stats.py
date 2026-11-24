from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import SessionDep
from app.goals import repository as goals_repository
from app.goals.models import GoalPeriod
from app.goals.schemas import GoalPublic, HabitProgressPublic
from app.goals.streak import GoalProgress
from app.group import repository
from app.group.exceptions import MSG_GROUP_NOT_FOUND, GroupNotFoundError
from app.group.habits import build_members_progress, get_habit_of_group
from app.group.loading import load_group_data
from app.group.permissions import require_member
from app.group.responses import RESPONSES_GROUP_HABIT_STATS, RESPONSES_GROUP_STATS
from app.group.schemas import (
  BestRecord,
  GroupHabitStatistics,
  GroupStatistics,
  MemberHabitStats,
  MostConsistent,
  RankingUser,
  StatHabit,
)
from app.group.status import group_reference_date
from app.habits import service as habits_service
from app.habits.exceptions import MSG_HABIT_NOT_FOUND, HabitNotFoundError
from app.statistics.calculations import days_window

stats_router = APIRouter(prefix="/groups", tags=["groups"])

# (user_id, username, habit_id, habit_name, progresso)
ConsistencyEntry = tuple[UUID, str, UUID, str, GoalProgress]
# (user_id, username, habit_id, habit_name, período da meta, progresso)
RecordEntry = tuple[UUID, str, UUID, str, GoalPeriod, GoalProgress]


def pick_most_consistent(entries: list[ConsistencyEntry]) -> ConsistencyEntry | None:
  """Entrada com mais `consistent_days` (dias corridos). Pura.

  Compara dias corridos, e não `current_streak`, porque o streak é medido em
  períodos (dias, semanas ou meses) e não se compara entre metas diferentes.
  Empate: menor `username`, depois menor nome do hábito e, por fim, o id do
  hábito, para o resultado não depender da ordem da lista. Lista vazia ou todos
  com 0 devolvem `None`. Devolve a própria tupla de entrada.
  """
  scored = [entry for entry in entries if entry[4].consistent_days > 0]
  if not scored:
    return None
  return min(
    scored,
    key=lambda entry: (-entry[4].consistent_days, entry[1], entry[3], str(entry[2])),
  )


def pick_best_record(entries: list[RecordEntry]) -> RecordEntry | None:
  """Entrada com maior `best_streak`, junto com a unidade da meta. Pura.

  Mesmo desempate de `pick_most_consistent`. Lista vazia ou todos com 0 devolvem
  `None`. Devolve a própria tupla de entrada.
  """
  scored = [entry for entry in entries if entry[5].best_streak > 0]
  if not scored:
    return None
  return min(
    scored,
    key=lambda entry: (-entry[5].best_streak, entry[1], entry[3], str(entry[2])),
  )


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


def get_group_statistics(db: Session, group_id: UUID, user: User) -> GroupStatistics:
  """Estatísticas do grupo: melhor em constância, maior recorde e check-ins.

  Só membros leem; grupo inexistente ou não membro levanta `GroupNotFoundError`
  (404). `as_of` é hoje ou o `ends_on` do grupo, o que vier primeiro: depois do
  fim, o resultado fica congelado. Entram os hábitos com meta (ativos e
  encerrados, cada um congelado na própria referência) e só os membros atuais.
  `most_consistent` e `best_record` são `None` quando ninguém pontuou.

  `check_ins_last_7_days` conta os check-ins do grupo em `[as_of - 6, as_of]`,
  incluindo os de quem saiu do grupo (como no feed).

  Faz um número fixo de consultas (permissão, hábitos com meta, membros, dias de
  check-in e a contagem), seja qual for o tamanho do grupo.
  """
  group, _ = require_member(db, group_id, user)

  today = habits_service.today()
  as_of = today if group.ends_on is None else min(today, group.ends_on)

  habits, members, days = load_group_data(db, group_id)
  user_ids = [member.user_id for member, _ in members]
  progress_by_member = build_members_progress(
    db, group, habits, user_ids, today, days=days
  )

  consistency_entries: list[ConsistencyEntry] = []
  record_entries: list[RecordEntry] = []
  for habit in habits:
    for member, member_user in members:
      progress = progress_by_member[(habit.id, member.user_id)]
      consistency_entries.append(
        (member.user_id, member_user.username, habit.id, habit.name, progress)
      )
      record_entries.append(
        (
          member.user_id,
          member_user.username,
          habit.id,
          habit.name,
          GoalPeriod(habit.goal.period),
          progress,
        )
      )

  most_consistent = None
  if (consistent := pick_most_consistent(consistency_entries)) is not None:
    user_id, username, habit_id, habit_name, progress = consistent
    most_consistent = MostConsistent(
      user=RankingUser(id=user_id, username=username),
      habit=StatHabit(id=habit_id, name=habit_name),
      consistent_days=progress.consistent_days,
    )

  best_record = None
  if (record := pick_best_record(record_entries)) is not None:
    user_id, username, habit_id, habit_name, unit, progress = record
    best_record = BestRecord(
      user=RankingUser(id=user_id, username=username),
      habit=StatHabit(id=habit_id, name=habit_name),
      best_streak=progress.best_streak,
      unit=unit,
    )

  start, end = days_window(as_of, 7)
  return GroupStatistics(
    as_of=as_of,
    most_consistent=most_consistent,
    best_record=best_record,
    check_ins_last_7_days=repository.count_group_check_ins(db, group_id, start, end),
  )


@stats_router.get(
  "/{group_id}/stats",
  response_model=GroupStatistics,
  status_code=status.HTTP_200_OK,
  summary="Estatísticas do grupo",
  description=(
    "Estatísticas do grupo na tela do ranking, para qualquer **membro**:"
    " `most_consistent` (quem tem mais dias corridos de constância, em qualquer"
    " hábito), `best_record` (maior recorde de sequência, com a unidade da meta:"
    " `day`, `week` ou `month`) e `check_ins_last_7_days` (check-ins do grupo nos"
    " últimos 7 dias, `as_of` incluído; um check-in em dois hábitos do grupo conta"
    " uma vez). Os dois primeiros são `null` quando ninguém pontuou. Só os"
    " membros atuais concorrem, mas os check-ins de quem saiu continuam na"
    " contagem, como no feed. Empates: menor `username`, depois nome do hábito."
    " `as_of` é hoje ou, depois do fim do grupo, o `ends_on`, quando tudo fica"
    " congelado."
  ),
  responses=RESPONSES_GROUP_STATS,
)
def get_stats(
  db: SessionDep,
  group_id: UUID,
  user: Annotated[User, Depends(get_current_user)],
) -> GroupStatistics:
  """Devolve as estatísticas do grupo para um membro."""
  try:
    return get_group_statistics(db, group_id, user)
  except GroupNotFoundError:
    raise HTTPException(status.HTTP_404_NOT_FOUND, MSG_GROUP_NOT_FOUND) from None
