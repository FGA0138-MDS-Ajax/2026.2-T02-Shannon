from fastapi import status

from app.auth.exceptions import MSG_NOT_AUTHENTICATED

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
    "rate": 0.75,
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
      "consistency": {"completed_periods": 3, "total_periods": 5, "rate": 0.6},
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
