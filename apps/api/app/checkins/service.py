from collections import defaultdict
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.checkins.models import CheckIn
from app.checkins.repository import list_habit_links
from app.checkins.schemas import (
  CategoryCount,
  CheckInCategoriesResponse,
  CheckInPublic,
  HabitOption,
  HabitOptionsPage,
  HabitOptionsQuery,
)
from app.habits.models import HabitCategory
from app.habits.repository import (
  count_eligible_habits_by_category,
  list_eligible_habits_page,
  list_habits_by_ids,
)
from app.habits.service import can_view_habit


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
