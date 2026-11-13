from collections import defaultdict
from datetime import date
from uuid import UUID

from fastapi import status
from sqlmodel import Session

from app.auth.models import User
from app.checkins import repository as checkins_repository
from app.checkins.exceptions import (
  MSG_CHECK_IN_HABIT_FORBIDDEN,
  MSG_GROUP_ENDED_CHECK_IN,
  CheckInForbiddenError,
  CheckInNotFoundError,
  CheckInRefusedError,
)
from app.checkins.models import CheckIn
from app.checkins.repository import list_habit_links
from app.checkins.schemas import (
  CategoryCount,
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInCreatedPublic,
  CheckInPublic,
  CheckInsPage,
  CheckInsQuery,
  CheckInUpdate,
  GroupSummary,
  HabitOption,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.goals import service as goals_service
from app.goals.schemas import HabitProgressPublic
from app.group.habits import build_members_progress
from app.group.repository import list_groups_of_user
from app.group.status import group_status
from app.habits import service as habits_service
from app.habits.exceptions import MSG_HABIT_FINISHED, MSG_HABIT_NOT_FOUND
from app.habits.models import Habit, HabitCategory
from app.habits.repository import (
  count_eligible_habits_by_category,
  list_eligible_habits_page,
  list_habits_by_ids,
)
from app.habits.service import (
  can_view_habit,
  get_check_in_eligible_habits,
  get_visible_habit,
)


def build_check_ins_public(
  db: Session, check_ins: list[CheckIn], user: User
) -> list[CheckInPublic]:
  """Monta a resposta dos check-ins com os `habit_ids` que o usuário pode ver.

  Faz 2 consultas no total (vínculos e hábitos), seja qual for o número de
  check-ins. Quem fez o check-in vê todos os hábitos; os outros, só os que
  passam em `can_view_habit`. A ordem de `habit_ids` não é garantida.
  """
  links = list_habit_links(db, [check_in.id for check_in in check_ins])
  habits = list_habits_by_ids(db, list({link.habit_id for link in links}))
  visible_habit_ids = {habit.id for habit in habits if can_view_habit(habit, user)}

  habit_ids_by_check_in: dict[UUID, list[UUID]] = defaultdict(list)
  for link in links:
    habit_ids_by_check_in[link.check_in_id].append(link.habit_id)

  result = []
  for check_in in check_ins:
    habit_ids = habit_ids_by_check_in[check_in.id]
    if check_in.user_id != user.id:
      habit_ids = [hid for hid in habit_ids if hid in visible_habit_ids]
    result.append(
      CheckInPublic(
        id=check_in.id,
        user_id=check_in.user_id,
        title=check_in.title,
        description=check_in.description,
        created_at=check_in.created_at,
        duration=check_in.duration,
        habit_ids=habit_ids,
      )
    )
  return result


def list_check_in_categories(db: Session, user: User) -> CheckInCategoriesResponse:
  """Retorna a contagem dos hábitos disponíveis do usuário por categoria."""
  rows = count_eligible_habits_by_category(db, user.id, habits_service.today())

  rows = sorted(
    rows,
    key=lambda row: (
      row[0] == HabitCategory.OUTROS,
      row[0].value if isinstance(row[0], HabitCategory) else row[0],
    ),
  )

  return CheckInCategoriesResponse(
    categories=[
      CategoryCount(name=category, habit_count=count) for category, count in rows
    ]
  )


def _group_summaries(
  db: Session, user: User, habits: list[Habit]
) -> dict[UUID, GroupSummary]:
  """Resumo `{id, name}` dos grupos do usuário, por id. Não faz commit.

  Faz 1 consulta, e só se algum hábito da lista for de grupo. Basta olhar os
  grupos do usuário: hábito de grupo elegível é sempre de um grupo dele.
  """
  if all(habit.author_group_id is None for habit in habits):
    return {}
  return {
    group.id: GroupSummary(id=group.id, name=group.name)
    for group, _ in list_groups_of_user(db, user.id)
  }


def list_check_in_habit_options(
  db: Session, user: User, query: HabitOptionsQuery
) -> HabitOptionsPage:
  """Retorna uma página de hábitos filtrados e indica se há mais resultados.

  Hábito de grupo vem com `group` preenchido; hábito pessoal, com `group` nulo.
  """
  limit = query.page_size + 1
  offset = (query.page - 1) * query.page_size

  habits = list_eligible_habits_page(
    db,
    user.id,
    habits_service.today(),
    category=query.category,
    exclude_category=query.exclude_category,
    limit=limit,
    offset=offset,
  )

  has_more = len(habits) > query.page_size
  habits = habits[: query.page_size]

  preselected = (
    query.category is not None
    and query.category != HabitCategory.OUTROS
    and query.page == 1
  )
  groups = _group_summaries(db, user, habits)

  return HabitOptionsPage(
    items=[
      HabitOption(
        id=habit.id,
        name=habit.name,
        category=habit.category,
        group=(
          groups.get(habit.author_group_id)
          if habit.author_group_id is not None
          else None
        ),
        preselected=preselected,
      )
      for habit in habits
    ],
    page=query.page,
    has_more=has_more,
  )


def _raise_refusal(db: Session, user: User, refused: list[UUID]) -> None:
  """Levanta a recusa do motivo mais grave: 404, depois 403, depois 409.

  O erro leva só os ids desse motivo. Entre os 409, grupo encerrado vem antes de
  hábito encerrado. Faz 1 consulta, mais 1 se algum hábito recusado for de grupo.
  """
  found = {habit.id: habit for habit in list_habits_by_ids(db, refused)}
  has_group_habit = any(h.author_group_id is not None for h in found.values())
  my_groups = (
    {group.id: group for group, _ in list_groups_of_user(db, user.id)}
    if has_group_habit
    else {}
  )
  today = habits_service.today()

  not_found: list[UUID] = []
  forbidden: list[UUID] = []
  group_ended: list[UUID] = []
  finished: list[UUID] = []

  for habit_id in refused:
    habit = found.get(habit_id)
    if habit is None:
      not_found.append(habit_id)
    elif habit.author_group_id is not None:
      group = my_groups.get(habit.author_group_id)
      if group is None:
        # Não é membro: 404, para não revelar o grupo.
        not_found.append(habit_id)
      elif group_status(group, today) == "ended":
        group_ended.append(habit_id)
      else:
        # Membro de grupo ativo e não elegível, então o hábito está encerrado.
        finished.append(habit_id)
    elif not can_view_habit(habit, user):
      not_found.append(habit_id)
    elif habit.author_user_id != user.id:
      forbidden.append(habit_id)
    else:
      # É do usuário e não é elegível, então está encerrado.
      finished.append(habit_id)

  if not_found:
    raise CheckInRefusedError(status.HTTP_404_NOT_FOUND, MSG_HABIT_NOT_FOUND, not_found)
  if forbidden:
    raise CheckInRefusedError(
      status.HTTP_403_FORBIDDEN, MSG_CHECK_IN_HABIT_FORBIDDEN, forbidden
    )
  if group_ended:
    raise CheckInRefusedError(
      status.HTTP_409_CONFLICT, MSG_GROUP_ENDED_CHECK_IN, group_ended
    )
  raise CheckInRefusedError(status.HTTP_409_CONFLICT, MSG_HABIT_FINISHED, finished)


def _group_habits_progress(
  db: Session, user: User, habits: list[Habit]
) -> dict[UUID, HabitProgressPublic]:
  """Progresso de quem fez o check-in em cada hábito de grupo. Não faz commit.

  Usa a função por membro da GRP-6 com um só usuário: 1 consulta para os grupos
  e mais 1 por grupo presente no check-in.
  """
  if not habits:
    return {}

  today = habits_service.today()
  groups = {group.id: group for group, _ in list_groups_of_user(db, user.id)}
  habits_by_group: dict[UUID, list[Habit]] = defaultdict(list)
  for habit in habits:
    habits_by_group[habit.author_group_id].append(habit)

  result: dict[UUID, HabitProgressPublic] = {}
  for group_id, group_habits in habits_by_group.items():
    members_progress = build_members_progress(
      db, groups[group_id], group_habits, [user.id], today
    )
    for habit in group_habits:
      progress = members_progress.get((habit.id, user.id))
      if progress is not None:
        result[habit.id] = HabitProgressPublic(
          habit_id=habit.id, goal=habit.goal, **progress.model_dump()
        )
  return result


def register_check_in(
  db: Session, user: User, data: CheckInCreate
) -> CheckInCreatedPublic:
  """Grava um check-in para vários hábitos, no modelo tudo ou nada.

  Levanta `CheckInRefusedError` se algum hábito não for elegível; nesse caso
  nada é gravado. Depois de gravar, devolve o progresso de cada hábito com meta,
  já contando este check-in. Nos hábitos de grupo, é o progresso de quem fez o
  check-in.
  """
  eligible_ids = {habit.id for habit in get_check_in_eligible_habits(db, user)}
  refused = [habit_id for habit_id in data.habit_ids if habit_id not in eligible_ids]
  if refused:
    _raise_refusal(db, user, refused)

  check_in = checkins_repository.create_check_in(
    db,
    user_id=user.id,
    title=data.title,
    description=data.description,
    duration=data.duration,
    habit_ids=data.habit_ids,
  )
  db.commit()
  db.refresh(check_in)

  # Busca os hábitos de novo: depois do commit, os elegíveis estão vencidos
  # (`expire_on_commit`) e ler `habit.goal` em cada um faria uma consulta por hábito.
  public = build_check_ins_public(db, [check_in], user)[0]
  habits = list_habits_by_ids(db, data.habit_ids)
  personal = [habit for habit in habits if habit.author_group_id is None]
  of_groups = [habit for habit in habits if habit.author_group_id is not None]

  progress = goals_service.calculate_habits_progress(db, personal)
  progress |= _group_habits_progress(db, user, of_groups)
  items = [progress[habit.id] for habit in habits if habit.id in progress]
  return CheckInCreatedPublic(**public.model_dump(), progress=items)


def get_visible_check_in(db: Session, check_in_id: UUID, user: User) -> CheckIn:
  """Devolve o check-in se o usuário o fez ou se vê algum hábito ligado a ele.

  Levanta `CheckInNotFoundError` se não existir ou se nenhum hábito ligado for
  visível para quem não fez o check-in.
  """
  check_in = checkins_repository.get_check_in_by_id(db, check_in_id)

  if check_in is None:
    raise CheckInNotFoundError

  if check_in.user_id == user.id:
    return check_in

  links = list_habit_links(db, [check_in.id])
  habits = list_habits_by_ids(db, [link.habit_id for link in links])

  if not any(can_view_habit(habit, user) for habit in habits):
    raise CheckInNotFoundError

  return check_in


def get_owned_check_in(db: Session, check_in_id: UUID, user: User) -> CheckIn:
  """Devolve o check-in só se o usuário for quem o fez.

  Levanta `CheckInNotFoundError` nos mesmos casos de `get_visible_check_in` e
  `CheckInForbiddenError` se o usuário vê o check-in, mas não o fez.
  """
  check_in = get_visible_check_in(db, check_in_id, user)

  if check_in.user_id != user.id:
    raise CheckInForbiddenError

  return check_in


def get_check_in(db: Session, check_in_id: UUID, user: User) -> CheckInPublic:
  """Consulta um check-in visível ao usuário, com os `habit_ids` que ele pode ver."""
  check_in = get_visible_check_in(db, check_in_id, user)
  return build_check_ins_public(db, [check_in], user)[0]


def update_check_in(
  db: Session, check_in_id: UUID, user: User, data: CheckInUpdate
) -> CheckInPublic:
  """Altera só os campos enviados do check-in de quem o fez.

  Levanta `CheckInNotFoundError` ou `CheckInForbiddenError` conforme
  `get_owned_check_in`.
  """
  check_in = get_owned_check_in(db, check_in_id, user)

  checkins_repository.update_check_in(db, check_in, data.model_dump(exclude_unset=True))
  db.commit()
  db.refresh(check_in)

  return build_check_ins_public(db, [check_in], user)[0]


def delete_check_in(db: Session, check_in_id: UUID, user: User) -> None:
  """Exclui definitivamente o check-in de quem o fez, junto com os vínculos.

  Levanta `CheckInNotFoundError` ou `CheckInForbiddenError` conforme
  `get_owned_check_in`.
  """
  check_in = get_owned_check_in(db, check_in_id, user)

  checkins_repository.delete_check_in(db, check_in)
  db.commit()


def list_habit_check_ins(
  db: Session, habit_id: UUID, user: User
) -> list[CheckInPublic]:
  """Histórico de check-ins de um hábito que o usuário pode ver.

  Levanta `HabitNotFoundError` se o hábito não existir ou for privado de outra
  pessoa. Hábito encerrado continua listando.
  """
  get_visible_habit(db, habit_id, user)
  check_ins = checkins_repository.list_check_ins_by_habit(db, habit_id)
  return build_check_ins_public(db, check_ins, user)


def list_user_check_ins(db: Session, user: User, query: CheckInsQuery) -> CheckInsPage:
  """Histórico de check-ins do usuário logado agrupados por data no banco.

  Retorna uma página de dias com seus check-ins e indica se há mais resultados.
  """
  limit = query.page_size + 1
  offset = (query.page - 1) * query.page_size

  rows = checkins_repository.list_user_check_ins_grouped_by_day(
    db, user_id=user.id, limit=limit, offset=offset
  )

  has_more = len(rows) > query.page_size
  rows = rows[: query.page_size]

  items: list[dict[date, list[CheckInPublic]]] = [
    {day: [CheckInPublic.model_validate(c) for c in check_ins]}
    for day, check_ins in rows
  ]

  return CheckInsPage(
    items=items,
    page=query.page,
    has_more=has_more,
  )
