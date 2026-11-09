# Especificação da API REST (OpenAPI)

Esta página documenta o contrato formal da API REST do **HABBIT** exposta pelo **FastAPI** (`apps/api/app/main.py`). Em ambiente de execução, a documentação interativa completa (**Swagger UI** e **ReDoc**) é gerada automaticamente pelo FastAPI nas rotas `/docs` e `/redoc`.

---

## 1. Visão Geral dos Endpoints Implementados

| Módulo | Método | Endpoint | Responsabilidade | Autenticação | Sucesso | Erros Mapeados |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **Health** | `GET` | `/` | Sondagem de saúde da API (`"OK"`) | Pública | `200` | — |
| **Auth** | `POST` | `/auth/signup` | Cadastro de conta e autenticação imediata | Pública | `201` | `409`, `422` |
| **Auth** | `POST` | `/auth/login` | Login por *username* ou e-mail e senha | Pública | `200` | `401`, `422` |
| **Auth** | `POST` | `/auth/refresh` | Renovação do par de tokens com rotação de JTI | Refresh Token | `200` | `401`, `422` |
| **Auth** | `POST` | `/auth/logout` | Encerramento idempotente da sessão no servidor | Refresh Token | `204` | `422` |
| **Session** | `GET` | `/auth/session/me` | Dados do usuário autenticado | Bearer JWT | `200` | `401` |
| **Habits** | `POST` | `/habits` | Criação de hábito ativo com meta inicial obrigatória | Bearer JWT | `201` | `401`, `422` |
| **Habits** | `GET` | `/habits` | Listagem de hábitos do usuário com meta e progresso | Bearer JWT | `200` | `401`, `422` |
| **Habits** | `GET` | `/habits/{habit_id}` | Consulta de hábito por ID (autor ou hábito público) | Bearer JWT | `200` | `401`, `404` |
| **Habits** | `PATCH` | `/habits/{habit_id}` | Edição parcial dos campos cadastrais do hábito | Autor (JWT) | `200` | `401`, `403`, `404`, `422` |
| **Habits** | `POST` | `/habits/{habit_id}/finish` | Encerramento de hábito ativo preservando histórico | Autor (JWT) | `200` | `401`, `403`, `404`, `409` |
| **Habits** | `DELETE` | `/habits/{habit_id}` | Exclusão definitiva do hábito (mantém check-ins) | Autor (JWT) | `204` | `401`, `403`, `404` |
| **Goals** | `PUT` | `/goals/habits/{habit_id}/goal` | Definição ou troca da meta (`day`, `week`, `month`) | Autor (JWT) | `200` | `401`, `403`, `404`, `409`, `422` |
| **Goals** | `GET` | `/goals/habits/{habit_id}/progress` | Progresso e streaks do hábito calculados na hora | Bearer JWT | `200` | `401`, `404` |
| **Check-ins** | `POST` | `/check-ins` | Registro de check-in multi-hábito (`1..20`) com progresso | Bearer JWT | `201` | `401`, `403`, `404`, `409`, `422` |
| **Check-ins** | `GET` | `/check-ins` | Histórico de check-ins do usuário agrupado por dias | Bearer JWT | `200` | `401`, `422` |
| **Check-ins** | `GET` | `/check-ins/categories` | Categorias com hábitos ativos elegíveis para check-in | Bearer JWT | `200` | `401` |
| **Check-ins** | `GET` | `/check-ins/habit-options` | Opções paginadas de hábitos ativos por categoria | Bearer JWT | `200` | `401`, `422` |
| **Check-ins** | `GET` | `/check-ins/{check_in_id}` | Consulta de check-in por ID | Bearer JWT | `200` | `401`, `404` |
| **Check-ins** | `PATCH` | `/check-ins/{check_in_id}` | Edição de título, descrição ou duração do check-in | Autor (JWT) | `200` | `401`, `403`, `404`, `422` |
| **Check-ins** | `DELETE` | `/check-ins/{check_in_id}` | Exclusão definitiva do check-in e de seus vínculos | Autor (JWT) | `204` | `401`, `403`, `404` |
| **Check-ins** | `GET` | `/habits/{habit_id}/check-ins` | Histórico de check-ins vinculados a um hábito | Bearer JWT | `200` | `401`, `404` |
| **Statistics** | `GET` | `/user/statistics` | Estatísticas consolidadas, streaks, risco e série diária | Bearer JWT | `200` | `401`, `422` |
| **Statistics** | `GET` | `/user/statistics/habits/{habit_id}/calendar` | Calendário mensal do hábito (`completed`, `partial`, `none`, `outside`) | Autor (JWT) | `200` | `401`, `404`, `422` |

---

## 2. Detalhamento dos Contratos Principais

### 2.1. Autenticação e Sessão (`/auth`)

#### `POST /auth/signup` (`201 Created`)
Cria a conta do usuário, registra a sessão em `auth_sessions` e devolve os dados públicos + par de tokens JWT:

```json
{
  "user": {
    "id": "b3d7f890-12a4-4e6c-9b01-76543210fedc",
    "name": "Pedro Melo",
    "username": "pedromelo",
    "email": "pedro@unb.br"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
}
```

---

### 2.2. Hábitos e Metas (`/habits` e `/goals`)

#### `POST /habits` (`201 Created`)
Cria um hábito ativo junto com sua meta inicial (`day`, `week` ou `month`):

```json
{
  "name": "Leitura Técnica",
  "description": "Ler pelo menos 20 páginas por dia",
  "category": "leitura",
  "is_public": true,
  "target_end_date": "2026-12-31",
  "goal": {
    "period": "week",
    "target_count": 5,
    "period_end_weekday": 7
  }
}
```

#### `GET /habits` (`200 OK` — Lista de `HabitWithProgress`)
Devolve os hábitos do usuário já enriquecidos com `goal` e `progress` calculado em lote:

```json
[
  {
    "id": "6f8a910c-3b2a-4d1e-8c9f-0123456789ab",
    "name": "Leitura Técnica",
    "description": "Ler pelo menos 20 páginas por dia",
    "category": "leitura",
    "is_public": true,
    "status": "active",
    "author_user_id": "b3d7f890-12a4-4e6c-9b01-76543210fedc",
    "created_at": "2026-10-15",
    "target_end_date": "2026-12-31",
    "finished_at": null,
    "goal": {
      "schedule_type": "frequency",
      "period": "week",
      "target_count": 5,
      "period_end_weekday": 7,
      "starts_on": "2026-10-15"
    },
    "progress": {
      "current_period": {
        "start": "2026-11-09",
        "end": "2026-11-15",
        "done": 1,
        "target_count": 5
      },
      "status": "in_progress",
      "current_streak": 3,
      "best_streak": 3,
      "streak_started_on": "2026-10-20",
      "consistent_days": 21
    }
  }
]
```

---

### 2.3. Check-ins Multi-hábito (`/check-ins`)

#### `POST /check-ins` (`201 Created`)
Registra um check-in vinculado a de 1 a 20 hábitos ativos e retorna o progresso recalculado de cada hábito vinculado:

- **Payload de Entrada (`CheckInCreate`):**
  ```json
  {
    "title": "Treino de corrida e cardio no Parque da Cidade",
    "description": "5km em ritmo moderado",
    "duration": "PT40M",
    "habit_ids": [
      "6f8a910c-3b2a-4d1e-8c9f-0123456789ab",
      "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
    ]
  }
  ```
- **Regra de Recusa Transacional (`CheckInRefusedError`):**
  Caso um ou mais `habit_ids` não possam receber o check-in, **nada é gravado** e a API retorna o código HTTP do motivo mais grave (`404 > 403 > 409`) acompanhado dos IDs causadores:
  ```json
  {
    "detail": "Hábito encerrado não aceita novos check-ins.",
    "habit_ids": ["9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"]
  }
  ```

---

### 2.4. Estatísticas e Calendário (`/user/statistics`)

#### `GET /user/statistics?mode=calendar&days=30` (`200 OK`)
Consolida todos os indicadores analíticos do usuário autenticado:

```json
{
  "reference_date": "2026-11-09",
  "timezone": "America/Sao_Paulo",
  "mode": "calendar",
  "habits": { "total": 4, "active": 3, "finished": 1 },
  "check_ins": { "total": 42, "today": 2, "week": 2, "month": 14 },
  "completed_habits": { "today": 1, "week": 1, "month": 2 },
  "goal_completion": {
    "completed_periods": 18,
    "total_periods": 20,
    "rate": 0.9,
    "days": 30
  },
  "activity_streak": { "current": 12, "best": 15 },
  "at_risk": {
    "count": 1,
    "habit_ids": ["6f8a910c-3b2a-4d1e-8c9f-0123456789ab"]
  },
  "habit_progress": [],
  "series": {
    "start": "2026-10-11",
    "end": "2026-11-09",
    "points": [
      { "date": "2026-10-11", "count": 1 },
      { "date": "2026-11-09", "count": 2 }
    ]
  }
}
```

#### `GET /user/statistics/habits/{habit_id}/calendar?month=2026-11` (`200 OK`)
Retorna o estado diário de cumprimento do hábito para o mês solicitado:

```json
{
  "habit_id": "6f8a910c-3b2a-4d1e-8c9f-0123456789ab",
  "month": "2026-11",
  "period": "week",
  "target_count": 5,
  "days": [
    { "date": "2026-11-01", "state": "completed" },
    { "date": "2026-11-02", "state": "none" },
    { "date": "2026-11-09", "state": "partial" },
    { "date": "2026-11-10", "state": "outside" }
  ]
}
```
