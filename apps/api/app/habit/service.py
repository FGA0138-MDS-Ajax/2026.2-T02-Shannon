from app.habit.exceptions import HabitForbiddenError, HabitNotFoundError
from app.habit.models import Habit
from app.habit.repository import get_habit_by_id


def get_visible_habit(db, habit_id, user_id) -> Habit:

  habit = get_habit_by_id(db, habit_id)

  if habit is None:
    raise HabitNotFoundError

  if user_id != habit.author_user_id and not habit.is_public:
    raise HabitNotFoundError

  return habit


def get_owned_habit(db, habit_id, user_id) -> Habit:

  habit = get_visible_habit(db, habit_id, user_id)

  if user_id != habit.author_user_id:
    raise HabitForbiddenError

  return habit
