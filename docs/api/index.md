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
| **Session** | `PATCH` | `/auth/session/me` | Edição parcial de nome, *username* e e-mail (e-mail exige a senha atual) | Bearer JWT | `200` | `400`, `401`, `409`, `422` |
| **Session** | `PUT` | `/auth/session/me/password` | Troca de senha; encerra todas as sessões e devolve novo par de tokens | Bearer JWT | `200` | `400`, `401`, `422` |
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
| **Photos** | `PUT` | `/check-ins/{check_in_id}/photo` | Envio ou substituição da foto do check-in de hoje (`multipart/form-data`, campo `photo`; JPEG ou PNG de até 4 MB) | Autor (JWT) | `200` | `400`, `401`, `403`, `404`, `409`, `413`, `415`, `422`, `503` |
| **Photos** | `DELETE` | `/check-ins/{check_in_id}/photo` | Remoção idempotente da foto do check-in de hoje | Autor (JWT) | `204` | `401`, `403`, `404`, `409`, `422` |
| **Statistics** | `GET` | `/user/statistics` | Estatísticas consolidadas, streaks, risco e série diária | Bearer JWT | `200` | `401`, `422` |
| **Statistics** | `GET` | `/user/statistics/habits/{habit_id}` | Estatísticas individuais de um hábito do usuário (ativo, encerrado ou sem meta) | Autor (JWT) | `200` | `401`, `404`, `422` |
| **Statistics** | `GET` | `/user/statistics/habits/{habit_id}/calendar` | Calendário mensal do hábito (`completed`, `partial`, `none`, `outside`) | Autor (JWT) | `200` | `401`, `404`, `422` |
| **Statistics** | `GET` | `/user/statistics/profile` | Resumo do perfil: sequência de atividade e total de check-ins | Bearer JWT | `200` | `401` |
| **Groups** | `POST` | `/groups` | Criação de grupo (criador torna-se `admin` e recebe `invite_code`) | Bearer JWT | `201` | `401`, `422` |
| **Groups** | `GET` | `/groups` | Listagem dos grupos do usuário (ativos primeiro, depois encerrados) | Bearer JWT | `200` | `401` |
| **Groups** | `GET` | `/groups/{group_id}` | Detalhe do grupo e lista de integrantes (`invite_code` só para admin) | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `PATCH` | `/groups/{group_id}` | Edição de nome, descrição, `ends_on` (inclui reabertura) e critério do ranking | Admin (JWT) | `200` | `401`, `403`, `404`, `422` |
| **Groups** | `POST` | `/groups/{group_id}/members` | Adição de integrante por *username* (máx. 30 membros; trava `FOR UPDATE`) | Admin (JWT) | `201` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/members` | Listagem de integrantes ordenados por `(joined_at, user_id)` | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `DELETE` | `/groups/{group_id}/members/{user_id}` | Remoção de integrante (inclusive outro admin; proibido remover a si mesmo) | Admin (JWT) | `204` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `POST` | `/groups/{group_id}/members/{user_id}/promote` | Promoção de membro a administrador (`role = 'admin'`) | Admin (JWT) | `200` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `POST` | `/groups/{group_id}/leave` | Saída do grupo com sucessão automática do último admin ou exclusão do grupo | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `GET` | `/groups/invite/{code}` | Pré-visualização de nome, nº de membros e status pelo código normalizado | Bearer JWT | `200` | `401`, `404` |
| **Groups** | `POST` | `/groups/join` | Ingresso no grupo pelo código de 8 caracteres (trava `FOR UPDATE`) | Bearer JWT | `201` | `401`, `404`, `409`, `422` |
| **Groups** | `POST` | `/groups/{group_id}/invite/regenerate` | Renovação imediata do `invite_code` (invalida o anterior) | Admin (JWT) | `200` | `401`, `403`, `404` |
| **Groups** | `POST` | `/groups/{group_id}/habits` | Criação de hábito de grupo com meta obrigatória (imutável) | Admin (JWT) | `201` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/habits` | Listagem dos hábitos do grupo (filtro opcional `?status=active\|finished`) | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/habits/{habit_id}` | Consulta de um hábito específico do grupo | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `PATCH` | `/groups/{group_id}/habits/{habit_id}` | Edição de dados cadastrais do hábito do grupo (ignora `goal`) | Admin (JWT) | `200` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `POST` | `/groups/{group_id}/habits/{habit_id}/finish` | Encerramento de hábito do grupo (congela progresso em `finished_at`) | Admin (JWT) | `200` | `401`, `403`, `404`, `409`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/check-ins` | Feed do grupo paginado por cursor opaco (`before` / `after`, `limit` 1..50) | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/ranking` | Ranking do grupo (`check_ins` ou `goals`, empates `1, 1, 3`, destaque `me`) | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/stats` | Destaques coletivos (`most_consistent`, `best_record`, `check_ins_last_7_days`) | Membro (JWT) | `200` | `401`, `404`, `422` |
| **Groups** | `GET` | `/groups/{group_id}/habits/{habit_id}/stats` | Progresso e `check_in_days` de cada integrante no hábito (`GRP-12`) | Membro (JWT) | `200` | `401`, `404`, `422` |

!!! note "Rotas da Sprint 6"
    As rotas de **Perfil** (`PATCH /auth/session/me`, `PUT /auth/session/me/password` e `GET /user/statistics/profile`) e de **Fotos** (`PUT`/`DELETE /check-ins/{id}/photo`) estão implementadas no Back-end. O consumo delas no aplicativo está em andamento. Detalhes em [Fotos e Perfil](../arquitetura/fotos-perfil.md).

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
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "exp": 1792207578
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
  Caso um ou mais `habit_ids` não possam receber o check-in, **nada é gravado** e a API retorna o código HTTP do motivo mais grave (`404 > 403 > 409 grupo encerrado > 409 hábito encerrado`) acompanhado dos IDs causadores:
  ```json
  {
    "detail": "Hábito encerrado não aceita check-ins.",
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
    "rate": 90.0,
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

---

### 2.5. Grupos, Feed, Ranking e Estatísticas Coletivas (`/groups` — Sprint 5)

#### `GET /groups/{group_id}/ranking` (`200 OK`)
Classifica os membros atuais do grupo pela existência inteira dos hábitos do grupo até `as_of` (`min(hoje, ends_on)`), com empates no padrão `1, 1, 3` e destaque do usuário logado em `me`:

```json
{
  "criterion": "goals",
  "as_of": "2026-11-14",
  "items": [
    { "position": 1, "user": { "id": "aa4590af-...", "username": "caio" }, "score": 5 },
    { "position": 1, "user": { "id": "75a158dd-...", "username": "joao" }, "score": 5 },
    { "position": 3, "user": { "id": "dfd45a6f-...", "username": "pedro" }, "score": 3 }
  ],
  "me": { "position": 3, "score": 3 }
}
```

#### `GET /groups/{group_id}/check-ins?limit=20&before=<cursor>` (`200 OK`)
Retorna itens do feed contendo apenas os hábitos pertencentes ao grupo, ordenados por `(created_at DESC, id DESC)`. Nas chamadas de *polling* (`?after=<cursor>`), `next_cursor` é sempre `null` e `has_more: true` indica repetição com o `cursor` do primeiro item recebido.

#### `POST /groups/{group_id}/leave` (`200 OK`)
Responde sempre `200` com `{ "group_deleted": false, "promoted_user_id": "75a158dd-..." }` (promovendo o membro de menor `(joined_at, user_id)` caso o último admin saia, ou apagando o grupo com `group_deleted: true` quando sai o último integrante).

---

### 2.6. Perfil e Conta (`/auth/session/me` e `/user/statistics/profile`)

#### `PATCH /auth/session/me` (`200 OK`)
Altera apenas os campos enviados. Para trocar o e-mail é obrigatório enviar `current_password`:

```json
{ "email": "novo@unb.br", "current_password": "senha-atual" }
```

#### `PUT /auth/session/me/password` (`200 OK`)
Exige `current_password`, `new_password` e `new_password_confirmation`. Todas as sessões do usuário são encerradas e a resposta traz um par de tokens novo, que o aplicativo deve guardar no lugar dos dois antigos. O *access token* já emitido em outros aparelhos continua valendo até expirar (15 minutos).

#### `GET /user/statistics/profile` (`200 OK`)

```json
{
  "id": "b3d7f890-12a4-4e6c-9b01-76543210fedc",
  "name": "Pedro Melo",
  "username": "pedromelo",
  "activity_streak": { "current": 12, "best": 15 },
  "check_ins_total": 42
}
```

---

### 2.7. Fotos de Check-in (`/check-ins/{id}/photo`)

`PUT /check-ins/{id}/photo` recebe `multipart/form-data` com o campo `photo` e devolve `CheckInPhotoPublic` (`thumbnail_url` sempre presente; `url` apenas quando a rota entrega a versão cheia):

```json
{ "thumbnail_url": "https://...", "url": null }
```

Nas respostas de check-ins, histórico do hábito e feed do grupo, o campo `photo` é `null` quando não há foto ou quando a pessoa não pode vê-la.

---

## 3. Códigos HTTP Utilizados

| Código | Quando ocorre |
| :---: | :--- |
| `200` / `201` / `204` | Sucesso (com corpo, criação e sem conteúdo, respectivamente). |
| `400` | Senha atual errada (conta e senha) ou arquivo de imagem inválido. A senha errada responde `400`, e não `401`, para o aplicativo não confundir com problema de token. |
| `401` | Token ausente, inválido ou expirado; credenciais de login inválidas; reuso de *refresh token*. |
| `403` | Operação exclusiva do autor (ou do administrador do grupo) tentada por outra pessoa. |
| `404` | Recurso inexistente ou privado de terceiros (a API não revela a existência). |
| `409` | Conflito de regra: duplicidade de *username*/e-mail, hábito ou grupo encerrado, meta de hábito de grupo, foto de check-in que não é de hoje, limite de membros. |
| `413` | Foto acima de 4 MB. |
| `415` | Foto que não é JPEG nem PNG. |
| `422` | Falha de validação dos dados de entrada. |
| `503` | Falha ao gravar a foto no armazenamento. |
