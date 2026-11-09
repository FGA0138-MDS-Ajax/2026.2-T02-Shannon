# Catálogo de Decisões de Arquitetura (ADRs)

Este catálogo registra as principais **Decisões de Arquitetura (*Architecture Decision Records — ADRs*)** tomadas pela **Equipe Shannon** durante o desenvolvimento do **HABBIT**, estruturadas segundo o formato de Michael Nygard (*Status, Contexto, Decisão e Consequências*).

---

## Índice de ADRs

| Código | Título da Decisão | Status | Requisitos Relacionados | Versão |
| :---: | :--- | :---: | :--- | :---: |
| **[ADR-001](#adr-001-arquitetura-modular-em-tres-camadas-router-service-repository)** | Arquitetura Modular em Três Camadas (`Router -> Service -> Repository`) | **Aceito** | Todos os RFs / `R-06` | v2.0 |
| **[ADR-002](#adr-002-sessoes-hibridas-jwt-com-rotacao-atomica-de-refresh-token)** | Sessões Híbridas JWT com Rotação Atômica de *Refresh Token* em Banco | **Aceito** | `C1-RF-02`, `C1-RNF-01`, `C1-RNF-03` | v2.0 |
| **[ADR-003](#adr-003-motor-de-metas-e-streaks-calculado-sob-demanda)** | Motor de Metas (`day`, `week`, `month`) e Streaks Calculado Sob Demanda | **Aceito** | `C2-RF-05`, `C3-RF-07`, `C3-RF-08`, `C4-RF-10` | v3.0 |
| **[ADR-004](#adr-004-relacao-nn-entre-check-ins-e-habitos-com-preservacao-de-historico)** | Relação N:N entre Check-ins e Hábitos com Preservação de Histórico | **Aceito** | `C3-RF-06`, `C2-RF-04`, `D-10`, `D-11` | v2.0 |
| **[ADR-005](#adr-005-adocao-de-alembic-e-colunas-varchar-com-check-constraints)** | Adoção de Alembic e Colunas `VARCHAR` com `CHECK Constraints` no PostgreSQL | **Aceito** | `R-03`, `C2-RF-03`, `C2-RF-05` | v3.0 |
| **[ADR-006](#adr-006-stack-mobile-com-expo-router-axios-refresh-queue-e-swr)** | Stack Mobile com Expo Router, Fila de Refresh no Axios e Cache Reativo SWR | **Aceito** | `C4-RNF-06`, `C3-RNF-04`, `R-02` | v3.0 |

---

## ADR-001: Arquitetura Modular em Três Camadas (`Router -> Service -> Repository`)

- **Status:** Aceito (Sprint 1 / v2.0)
- **Contexto:** A equipe de Back-end precisava evoluir múltiplos domínios em paralelo (`auth`, `habits`, `goals`, `checkins`, `statistics`, `group`) sem acoplamento excessivo e facilitando testes unitários e de integração.
- **Decisão:** Organizar o Web Server FastAPI por pacotes de domínio, onde cada módulo separa estritamente:
  1. `router.py` (protocolo HTTP, status codes, injeção de sessão/usuário e OpenAPI);
  2. `service.py` (regras de negócio, validações de permissão e controle de `commit`);
  3. `repository.py` (consultas SQLModel/SQLAlchemy sem `commit` e sem regras de negócio);
  4. `schemas.py` (contratos Pydantic) separados de `models.py` (tabelas SQLModel).
- **Consequências:** Padronização imediata entre desenvolvedores, facilidade para reutilizar cálculos entre módulos (ex.: `checkins` e `statistics` reutilizando `goals.service` e `goals.streak`) e alta testabilidade.

---

## ADR-002: Sessões Híbridas JWT com Rotação Atômica de *Refresh Token* em Banco

- **Status:** Aceito (Sprint 1 / v2.0)
- **Contexto:** Tokens JWT puramente *stateless* não permitem revogação imediata no logout nem detecção de roubo de *refresh token*.
- **Decisão:** Implementar um modelo híbrido: o `access_token` de curta duração é validado via assinatura JWT, enquanto cada sessão é persistida na tabela `auth_sessions` com um `current_jti` (UUID). A cada chamada a `POST /auth/refresh`, o `current_jti` é substituído atomicamente no banco. Se um *refresh token* com `jti` antigo for apresentado, o servidor identifica tentativa de reuso, apaga a linha em `auth_sessions` e recusa com `HTTP 401`.
- **Consequências:** Logout real e idempotente no servidor (`POST /auth/logout` retorna `204`), renovação transparente no aplicativo móvel e proteção contra sequestro de sessão.

---

## ADR-003: Motor de Metas (`day`, `week`, `month`) e Streaks Calculado Sob Demanda

- **Status:** Aceito (Sprint 3–4 / v3.0)
- **Contexto:** Persistir `current_streak` ou `status` como colunas estáticas no banco exigiria *cron jobs* à meia-noite e recálculos complexos sempre que o usuário excluísse um check-in antigo (`US-10`) ou alterasse a meta (`US-08`).
- **Decisão:** Calcular `GoalProgress` (`current_period`, `status`, `current_streak`, `best_streak`, `streak_started_on`, `consistent_days`) e `UserStatistics` dinamicamente na hora da consulta, convertendo os `created_at` (`TIMESTAMPTZ`) dos check-ins para datas no fuso `America/Sao_Paulo`. Para manter o P95 abaixo de 500 ms, as consultas de listagem (`GET /habits`, `POST /check-ins`, `GET /user/statistics`) carregam os dias de check-in de todos os hábitos do usuário em uma única *query* em lote (`list_check_in_days_for_habits`).
- **Consequências:** Consistência matemática de 100% após qualquer criação, edição ou exclusão de check-in, ausência de *jobs* agendados no servidor e testes unitários puros extremadamente rápidos (`tests/goals/unit/test_streak.py` e `tests/statistics/unit/test_calculations.py`).

---

## ADR-004: Relação N:N entre Check-ins e Hábitos com Preservação de Histórico

- **Status:** Aceito (Sprint 2 / v2.0)
- **Contexto:** Uma mesma atividade do usuário (ex.: *"Treino de corrida e cardio no parque por 45 min"*) frequentemente cumpre mais de um hábito ativo simultaneamente (`corrida` e `cardio`). Além disso, excluir um hábito não deve destruir o histórico geral de atividades feitas pelo usuário.
- **Decisão:** Desacoplar `check_ins` de `habits` por meio da tabela associativa `check_in_habits` (chave primária composta `check_in_id, habit_id` com `ON DELETE CASCADE` em ambas as FKs). Cada check-in exige de 1 a 20 `habit_ids` na criação.
- **Consequências:** Registro multi-hábito em uma única requisição (`POST /check-ins`) e preservação dos check-ins quando um hábito é excluído (`D-11`).

---

## ADR-005: Adoção de Alembic e Colunas `VARCHAR` com `CHECK Constraints` no PostgreSQL

- **Status:** Aceito (Sprint 3–4 / v3.0)
- **Contexto:** Tipos `ENUM` nativos do PostgreSQL dificultam a adição ou alteração de valores em migrações incrementais.
- **Decisão:** Utilizar o **Alembic** para gerenciar o histórico de migrações do banco e declarar colunas de domínio enumerado (`habits.category`, `goals.period`, `goals.schedule_type`) como `VARCHAR` validado no Pydantic (`StrEnum`) e protegido no banco por `CheckConstraint` explícitas (`ck_habits_status_finished_at` e `ck_goals_period_rules`).
- **Consequências:** Evolução simples de schema via Alembic sem bloqueios de `ALTER TYPE` no PostgreSQL, mantendo rigorosa integridade relacional no SGBD.

---

## ADR-006: Stack Mobile com Expo Router, Fila de Refresh no Axios e Cache Reativo SWR

- **Status:** Aceito (Sprint 2–4 / v3.0)
- **Contexto:** O aplicativo móvel precisava compartilhar dados do usuário, lista de hábitos e estatísticas entre várias telas sem recarregamentos manuais e sem deslogar o usuário quando múltiplas requisições simultâneas encontrassem um `access_token` expirado.
- **Decisão:**
  1. Adotar **Expo Router** para navegação tipada baseada em arquivos (`(auth)` vs. `(app)`);
  2. Implementar no cliente **Axios** (`src/services/api.ts`) um interceptor com trava (`isRefreshing`) e fila de promessas (`failedQueue`) que renova o token uma única vez em `POST /auth/refresh` e reexecuta todas as chamadas pendentes;
  3. Adotar **SWR** (`src/config/swr.tsx`) para *data fetching*, cache em memória e revalidação automática ao focar a tela;
  4. Estilizar componentes com `StyleSheet` nativo e sistema de design centralizado (`src/config/theme.ts`).
- **Consequências:** Interface fluida e responsiva, zero condições de corrida na rotação de *refresh token* (evitando falsos positivos de reuso de JTI) e facilidade de testes com Jest.
