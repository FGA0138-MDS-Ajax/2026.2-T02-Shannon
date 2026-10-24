from collections import defaultdict
from uuid import UUID

from fastapi import status
from sqlmodel import Session

from app.auth.models import User
from app.checkins import repository as checkins_repository
from app.checkins.exceptions import (
  MSG_CHECK_IN_HABIT_FORBIDDEN,
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
  CheckInPublic,
  CheckInUpdate,
  HabitOption,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.habits.exceptions import MSG_HABIT_FINISHED, MSG_HABIT_NOT_FOUND
from app.habits.models import HabitCategory
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
  rows = count_eligible_habits_by_category(db, user.id)

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


def list_check_in_habit_options(
  db: Session, user: User, query: HabitOptionsQuery
) -> HabitOptionsPage:
  """Retorna uma página de hábitos filtrados e indica se há mais resultados."""
  limit = query.page_size + 1
  offset = (query.page - 1) * query.page_size

  habits = list_eligible_habits_page(
    db,
    user.id,
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

  return HabitOptionsPage(
    items=[
      HabitOption(
        id=habit.id,
        name=habit.name,
        category=habit.category,
        group=None,
        preselected=preselected,
      )
      for habit in habits
    ],
    page=query.page,
    has_more=has_more,
  )


def _raise_refusal(db: Session, user: User, refused: list[UUID]) -> None:
  """Levanta a recusa do motivo mais grave: 404, depois 403, depois 409.

  O erro leva só os ids desse motivo. Faz 1 consulta.
  """
  found = {habit.id: habit for habit in list_habits_by_ids(db, refused)}
  not_found: list[UUID] = []
  forbidden: list[UUID] = []
  finished: list[UUID] = []

  for habit_id in refused:
    habit = found.get(habit_id)
    if habit is None or not can_view_habit(habit, user):
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
  raise CheckInRefusedError(status.HTTP_409_CONFLICT, MSG_HABIT_FINISHED, finished)


def register_check_in(db: Session, user: User, data: CheckInCreate) -> CheckInPublic:
  """Grava um check-in para vários hábitos, no modelo tudo ou nada.

  Levanta `CheckInRefusedError` se algum hábito não for elegível; nesse caso
  nada é gravado.
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

  return build_check_ins_public(db, [check_in], user)[0]


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
