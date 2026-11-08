from fastapi import status

from app.auth.exceptions import MSG_NOT_AUTHENTICATED
from app.goals.exceptions import MSG_GOAL_NOT_FOUND
from app.habits.exceptions import MSG_HABIT_NOT_FOUND
from app.statistics.exceptions import MSG_CALENDAR_MONTH_INVALID

# Valores ilustrativos: mostram o formato da resposta, não um cálculo real.
EXAMPLE_STATISTICS = {
  "reference_date": "2026-11-04",
  "timezone": "America/Sao_Paulo",
  "mode": "calendar",
  "habits": {"total": 3, "active": 2, "finished": 1},
  "check_ins": {"total": 42, "today": 1, "week": 3, "month": 4},
  "completed_habits": {"today": 1, "week": 2, "month": 2},
  "goal_completion": {
    "completed_periods": 18,
    "total_periods": 24,
    "rate": 75.0,
    "days": 30,
  },
  "activity_streak": {"current": 3, "best": 9},
  "at_risk": {"count": 1, "habit_ids": ["8b6f1c52-3a4e-4d7b-9c1a-2f5e6d7c8b90"]},
  "habit_progress": [
    {
      "current_period": {
        "start": "2026-11-02",
        "end": "2026-11-08",
        "done": 2,
        "target_count": 4,
      },
      "status": "at_risk",
      "current_streak": 2,
      "best_streak": 5,
      "streak_started_on": "2026-10-19",
      "consistent_days": 17,
      "habit_id": "8b6f1c52-3a4e-4d7b-9c1a-2f5e6d7c8b90",
      "goal": {
        "schedule_type": "frequency",
        "period": "week",
        "target_count": 4,
        "period_end_weekday": 7,
        "starts_on": "2026-09-01",
      },
      "name": "Correr",
      "checked_today": True,
      "consistency": {"completed_periods": 3, "total_periods": 5, "rate": 60.0},
    }
  ],
  "series": {
    "start": "2026-10-06",
    "end": "2026-11-04",
    "points": [
      {"date": "2026-10-06", "count": 0},
      {"date": "2026-10-07", "count": 2},
      {"date": "2026-11-04", "count": 1},
    ],
  },
}

RESPONSES_STATISTICS = {
  status.HTTP_200_OK: {
    "description": "Estatísticas do usuário logado.",
    "content": {"application/json": {"example": EXAMPLE_STATISTICS}},
  },
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
    "content": {"application/json": {"example": {"detail": MSG_NOT_AUTHENTICATED}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": "Parâmetro de consulta inválido.",
    "content": {
      "application/json": {
        "examples": {
          "mode_invalido": {
            "summary": "`mode` fora de calendar e rolling",
            "value": {
              "detail": [
                {
                  "type": "enum",
                  "loc": ["query", "mode"],
                  "msg": "Input should be 'calendar' or 'rolling'",
                  "input": "semana",
                  "ctx": {"expected": "'calendar' or 'rolling'"},
                }
              ]
            },
          },
          "days_fora_do_intervalo": {
            "summary": "`days` fora de 1 a 365",
            "value": {
              "detail": [
                {
                  "type": "less_than_equal",
                  "loc": ["query", "days"],
                  "msg": "Input should be less than or equal to 365",
                  "input": "366",
                  "ctx": {"le": 365},
                }
              ]
            },
          },
        }
      }
    },
  },
}

EXAMPLE_CALENDAR = {
  "habit_id": "8b6f1c52-3a4e-4d7b-9c1a-2f5e6d7c8b90",
  "month": "2026-10",
  "period": "week",
  "target_count": 4,
  "days": [
    {"date": "2026-10-01", "state": "outside"},
    {"date": "2026-10-12", "state": "completed"},
    {"date": "2026-10-14", "state": "none"},
    {"date": "2026-10-19", "state": "partial"},
  ],
}

RESPONSES_CALENDAR = {
  status.HTTP_200_OK: {
    "description": (
      "Calendário mensal do hábito com o estado de cada dia:\n\n"
      "- `outside`: fora da vida do hábito (antes do início da meta, depois do"
      " encerramento do hábito ou depois de hoje).\n"
      "- `completed`: o dia tem check-in e o período da meta que contém o dia"
      " foi cumprido.\n"
      "- `partial`: o dia tem check-in, mas o período não foi cumprido (aberto"
      " ou fechado).\n"
      "- `none`: dentro da vida do hábito e sem check-in.\n\n"
      "Na meta diária, `partial` nunca aparece: o dia com check-in é sempre"
      " `completed`."
    ),
    "content": {"application/json": {"example": EXAMPLE_CALENDAR}},
  },
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
    "content": {"application/json": {"example": {"detail": MSG_NOT_AUTHENTICATED}}},
  },
  status.HTTP_404_NOT_FOUND: {
    "description": (
      "Hábito inexistente ou de outro usuário (privado ou público), ou hábito sem meta."
    ),
    "content": {
      "application/json": {
        "examples": {
          "habito_nao_encontrado": {
            "summary": "Hábito inexistente, privado ou público de outro usuário",
            "value": {"detail": MSG_HABIT_NOT_FOUND},
          },
          "habito_sem_meta": {
            "summary": "Hábito criado antes das metas, ainda sem uma",
            "value": {"detail": MSG_GOAL_NOT_FOUND},
          },
        }
      }
    },
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: {
    "description": (
      "Parâmetro de consulta inválido (mês fora do formato AAAA-MM) ou"
      " identificador do hábito inválido (não é um UUID)."
    ),
    "content": {
      "application/json": {
        "examples": {
          "mes_invalido": {
            "summary": "Mês fora do formato AAAA-MM ou com mês inválido",
            "value": {
              "detail": [
                {
                  "type": "value_error",
                  "loc": ["query", "month"],
                  "msg": f"Value error, {MSG_CALENDAR_MONTH_INVALID}",
                  "input": "2026-13",
                  "ctx": {"error": {}},
                }
              ]
            },
          },
          "id_invalido": {
            "summary": "Identificador do hábito não é um UUID",
            "value": {
              "detail": [
                {
                  "type": "uuid_parsing",
                  "loc": ["path", "habit_id"],
                  "msg": "Input should be a valid UUID",
                }
              ]
            },
          },
        }
      }
    },
  },
}


EXAMPLE_HABIT_STATISTICS = {
  "reference_date": "2026-11-07",
  "timezone": "America/Sao_Paulo",
  "mode": "calendar",
  "habit_id": "8b6f1c52-3a4e-4d7b-9c1a-2f5e6d7c8b90",
  "name": "Correr",
  "habit_status": "active",
  "check_ins": {
    "total": 42,
    "today": 1,
    "week": 3,
    "month": 4,
  },
  "series": {
    "start": "2026-10-09",
    "end": "2026-11-07",
    "points": [
      # Outubro: 23 dias, de 09/10 a 31/10.
      {"date": "2026-10-09", "count": 0},
      {"date": "2026-10-10", "count": 2},
      {"date": "2026-10-11", "count": 0},
      {"date": "2026-10-12", "count": 0},
      {"date": "2026-10-13", "count": 0},
      {"date": "2026-10-14", "count": 0},
      {"date": "2026-10-15", "count": 0},
      {"date": "2026-10-16", "count": 0},
      {"date": "2026-10-17", "count": 0},
      {"date": "2026-10-18", "count": 0},
      {"date": "2026-10-19", "count": 0},
      {"date": "2026-10-20", "count": 0},
      {"date": "2026-10-21", "count": 0},
      {"date": "2026-10-22", "count": 0},
      {"date": "2026-10-23", "count": 0},
      {"date": "2026-10-24", "count": 0},
      {"date": "2026-10-25", "count": 0},
      {"date": "2026-10-26", "count": 0},
      {"date": "2026-10-27", "count": 0},
      {"date": "2026-10-28", "count": 0},
      {"date": "2026-10-29", "count": 0},
      {"date": "2026-10-30", "count": 0},
      {"date": "2026-10-31", "count": 0},
      # Novembro: 4 check-ins no mês, sendo 3 na semana e 1 hoje.
      {"date": "2026-11-01", "count": 1},
      {"date": "2026-11-02", "count": 1},
      {"date": "2026-11-03", "count": 0},
      {"date": "2026-11-04", "count": 0},
      {"date": "2026-11-05", "count": 1},
      {"date": "2026-11-06", "count": 0},
      {"date": "2026-11-07", "count": 1},
    ],
  },
  "progress": {
    "current_period": {
      "start": "2026-11-02",
      "end": "2026-11-08",
      "done": 3,
      "target_count": 4,
    },
    "status": "at_risk",
    "current_streak": 0,
    "best_streak": 8,
    "streak_started_on": "2026-11-02",
    "consistent_days": 6,
    "habit_id": "8b6f1c52-3a4e-4d7b-9c1a-2f5e6d7c8b90",
    "goal": {
      "schedule_type": "frequency",
      "period": "week",
      "target_count": 4,
      "period_end_weekday": 7,
      "starts_on": "2026-09-01",
    },
    "name": "Correr",
    "checked_today": True,
    "consistency": {
      "completed_periods": 0,
      "total_periods": 4,
      "rate": 0.0,
    },
  },
}

RESPONSES_HABIT_STATISTICS = {
  status.HTTP_200_OK: {
    "description": (
      "Estatísticas do hábito solicitado. Os números de `check_ins` e `series`"
      " são só deste hábito.\n\n"
      "Um check-in ligado a vários hábitos conta uma vez em cada um deles. Por"
      " isso, a soma dos hábitos pode passar do `check_ins.total` de"
      " `GET /user/statistics`.\n\n"
      "`progress` é `null` quando o hábito não tem meta."
    ),
    "content": {"application/json": {"example": EXAMPLE_HABIT_STATISTICS}},
  },
  status.HTTP_401_UNAUTHORIZED: {
    "description": "Usuário não autenticado ou token inválido.",
    "content": {"application/json": {"example": {"detail": MSG_NOT_AUTHENTICATED}}},
  },
  status.HTTP_404_NOT_FOUND: {
    "description": "Hábito não encontrado ou não pertence ao usuário.",
    "content": {"application/json": {"example": {"detail": MSG_HABIT_NOT_FOUND}}},
  },
  status.HTTP_422_UNPROCESSABLE_ENTITY: RESPONSES_STATISTICS[
    status.HTTP_422_UNPROCESSABLE_ENTITY
  ],
}
