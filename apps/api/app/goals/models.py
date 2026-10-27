from enum import StrEnum

class GoalPeriod(StrEnum):
  DAY = "day"
  WEEK = "week"
  MONTH = "month"

class ScheduleType(StrEnum):
  FREQUENCY = "frequency"
