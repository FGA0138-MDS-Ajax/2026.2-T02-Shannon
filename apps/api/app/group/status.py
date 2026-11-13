from datetime import date
from typing import Literal

from app.group.models import Group
from app.habits.models import Habit


def group_status(group: Group, today: date) -> Literal["active", "ended"]:
  """Calcula o estado do grupo de forma pura com base na data informada.

  Um grupo com `ends_on` igual a `today` ainda está ativo; só encerra no dia
  seguinte (`ends_on < today`).
  """
  if group.ends_on is not None and group.ends_on < today:
    return "ended"
  return "active"


def group_reference_date(group: Group, habit: Habit, today: date) -> date:
  """Data de referência de cálculo de um hábito de grupo. Pura."""
  limits = [today]
  if habit.finished_at is not None:
    limits.append(habit.finished_at)
  if group.ends_on is not None:
    limits.append(group.ends_on)
  return min(limits)
