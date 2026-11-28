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
| **[ADR-007](#adr-007-grupos-multi-habito-trava-pessimista-sucessao-e-estado-sob-demanda)** | Grupos Multi-hábito, Trava Pessimista (`FOR UPDATE`), Sucessão e Estado Sob Demanda | **Aceito** | `C5-RF-11` a `C5-RF-13`, `D-05`, `D-06` | v4.0 |
| **[ADR-008](#adr-008-feed-de-grupo-com-paginacao-por-cursor-opaco-e-polling-sem-websocket)** | Feed de Grupo com Paginação por Cursor Opaco e *Polling* (sem WebSocket) | **Aceito** | `C7-RF-17`, `US-30`, `D-07` | v4.0 |
| **[ADR-009](#adr-009-armazenamento-de-fotos-de-check-in-em-object-storage-s3-compativel-cloudflare-r2)** | Armazenamento de Fotos de Check-in em Object Storage S3-Compatível (Cloudflare R2) | **Aceito (S6)** | `C7-RF-16`, `C7-RNF-07`, `US-28`, `US-29` | v4.0 |
| **[ADR-010](#adr-010-hospedagem-serverless-da-api-na-vercel-hobby-e-postgresql-17-no-neon-free)** | Hospedagem *Serverless* da API na Vercel Hobby (`gru1`) e PostgreSQL 17 no Neon Free (`aws-sa-east-1`) | **Aceito** | `C1-RNF-02`, `C4-RNF-05` | v4.1 |
| **[ADR-011](#adr-011-entrega-oficial-via-expo-web-pwa-e-retirada-do-nginx)** | Entrega Oficial via Expo Web (PWA) e Retirada do NGINX | **Aceito** | `C1-RNF-02`, `C4-RNF-06` | v4.1 |
| **[ADR-012](#adr-012-publicacao-manual-por-cli-e-script-local-sem-tokens-no-github)** | Publicação Manual por CLI e Script Local (`scripts/deploy.sh`) sem Tokens no GitHub | **Aceito** | `C1-RNF-01` a `03` | v4.1 |

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

---

## ADR-007: Grupos Multi-hábito, Trava Pessimista (`FOR UPDATE`), Sucessão e Estado Sob Demanda

- **Status:** Aceito (Sprint 5 / v4.0)
- **Contexto:** Na implementação da Sprint 5, identificou-se que restringir cada grupo a um único hábito limitava desafios coletivos reais e que operações concorrentes sobre membros (dois admins saindo simultaneamente ou dois usuários disputando a 30ª vaga) poderiam corromper invariantes do grupo.
- **Decisão:**
  1. Permitir múltiplos hábitos por grupo por meio de `habits.author_group_id` e da constraint `CHECK ck_habits_single_author` (exatamente um autor: usuário **ou** grupo), bloqueando edição da meta (`HTTP 409`);
  2. Calcular o estado do grupo (`active`/`ended`) dinamicamente comparando `ends_on` com hoje (fuso `America/Sao_Paulo`), permitindo reabertura imediata via `PATCH` e congelamento automático do ranking em `as_of = min(hoje, ends_on)`;
  3. Serializar mutações de membros e renovação de código de convite com trava pessimista na linha do grupo (`SELECT ... FOR UPDATE`), garantindo sucessão determinística pelo menor `(joined_at, user_id)` e exclusão automática quando sai o último integrante.
- **Consequências:** Zero risco de grupo órfão sem administrador ou acima de 30 membros (provado por testes de concorrência em `test_groups_concurrency.py`) e ausência de tarefas agendadas para encerrar grupos.

---

## ADR-008: Feed de Grupo com Paginação por Cursor Opaco e *Polling* (sem WebSocket)

- **Status:** Aceito (Sprint 5 / v4.0)
- **Contexto:** A paginação tradicional por `OFFSET` duplica ou omite itens no feed sempre que novos check-ins chegam no topo. Por outro lado, manter WebSockets exigiria gestão de conexões persistentes, reconexão móvel e autenticação dedicada para um volume baixo de leitura.
- **Decisão:** Expor `GET /groups/{group_id}/check-ins` com **cursor opaco** codificando o par estável `(created_at, id)` e parâmetros mutuamente exclusivos `before` (rolagem para itens antigos) e `after` (novidades), consumidos pelo app via *polling* leve de 10 a 15 segundos apenas com a tela em foco.
- **Consequências:** Navegação estável sem itens duplicados ou pulados mesmo em check-ins com o mesmo timestamp, mantendo a arquitetura HTTP/REST simples e stateless.

---

## ADR-009: Armazenamento de Fotos de Check-in em Object Storage S3-Compatível (Cloudflare R2)

- **Status:** Aceito (Sprint 6 / v4.0 — em implementação)
- **Contexto:** Salvar binários de imagem diretamente no PostgreSQL degrada backups e consultas, enquanto serviços de *object storage* convencionais cobram tráfego de saída (*egress*) na exibição de fotos em feeds.
- **Decisão:** Adotar o **Cloudflare R2** acessado via SDK `boto3` (API S3-compatível), isolado por uma interface `Storage` com implementações `S3Storage` (produção) e `FakeStorage` (testes automatizados), armazenando versão cheia e miniatura acessadas por URLs temporárias assinadas e removidas automaticamente nas exclusões (`FOTO-1`–`FOTO-7`).
- **Consequências:** Zero custo de *egress*, conformidade com `C7-RNF-07`, banco relacional enxuto e suíte `pytest` rápida sem dependência de rede externa.

---

## ADR-010: Hospedagem *Serverless* da API na Vercel Hobby e PostgreSQL 17 no Neon Free

- **Status:** Aceito (Deploy / v4.1)
- **Contexto:** O projeto precisava operar 24 horas em endereço público HTTPS, com custo zero, sem exigência de cartão de crédito e sem administração manual de servidor Linux (VPS), mantendo baixa latência no Brasil.
- **Decisão:**
  1. Publicar a API FastAPI (`apps/api`) na **Vercel Hobby** com Python 3.13 + `uv` nativo na região **São Paulo (`gru1`)** (`apps/api/vercel.json`) e `CORS_ORIGINS` restrito à URL da PWA;
  2. Provisionar o **PostgreSQL 17** no **Neon Free** na região **AWS São Paulo (`aws-sa-east-1`)**, usando a URL com **`-pooler`** (`DATABASE_URL`) e `pool_pre_ping=True` em execução, e a URL direta (`DIRECT_DATABASE_URL`, sem `-pooler`) para rodar `alembic upgrade head` no build de produção (`scripts/vercel_build.py`, apenas quando `VERCEL_ENV=production`).
- **Consequências:** Custo R$ 0,00/mês, co-localização API ↔ Banco em São Paulo e reconexão transparente após suspensão por inatividade do Neon; sujeito ao teto de 4,5 MB por requisição na Vercel Hobby (fotos limitadas a 4 MB na API) e às cotas mensais gratuitas (4 CPU-h na Vercel e 100 CU-h no Neon).

---

## ADR-011: Entrega Oficial via Expo Web (PWA) e Retirada do NGINX

- **Status:** Aceito (Deploy / v4.1)
- **Contexto:** Publicar nas lojas oficiais (Google Play e Apple App Store) é inviável para o prazo e orçamento da disciplina (taxas pagas e regra de 12 testadores por 14 dias na Play Store). Além disso, o PaaS escolhido já fornece proxy reverso e TLS automáticos na borda.
- **Decisão:**
  1. Adotar o **Expo Web (`output: "static"`) publicado como PWA instalável na Vercel** (`https://habbit-routine.vercel.app`, com `manifest.json`, ícones e meta tags Apple em `+html.tsx`) como entrega oficial multiplataforma;
  2. Retirar o **NGINX** da topologia de produção, delegando terminação TLS/HTTPS, compressão e repasse de IP (`X-Forwarded-For`) à camada de borda da Vercel;
  3. Manter provisoriamente o armazenamento de tokens em `localStorage` (`token-storage.web.ts`) para a apresentação, registrando-o como limitação conhecida de segurança.
- **Consequências:** Acesso imediato por link único em Android, iOS e desktop sem depender de lojas nem de configuração manual de NGINX/Certbot; componentes nativos sem equivalente web (`Alert.alert` e `@expo/ui` no `DateField`) precisam de adaptação dedicada para o navegador em issue própria do Front-end.

---

## ADR-012: Publicação Manual por CLI e Script Local sem Tokens no GitHub

- **Status:** Aceito (Deploy / v4.1)
- **Contexto:** Os projetos na Vercel (`habbit-api` e `habbit-web`) e o banco no Neon estão hospedados na conta pessoal do mantenedor de deploy, enquanto o repositório no GitHub é público e compartilhado com toda a equipe. Armazenar `VERCEL_TOKEN` nos *Secrets* do GitHub Actions permitiria que qualquer pessoa com escrita no repositório lesse o token por meio de workflows.
- **Decisão:** Não conectar o repositório GitHub aos projetos da Vercel e não gravar nenhum token da Vercel no GitHub. A publicação em produção parte exclusivamente da branch `main` por meio do script manual [`scripts/deploy.sh`](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/blob/main/scripts/deploy.sh), que valida o estado da `main` e do CI (GitHub Actions) e utiliza apenas o login local da Vercel CLI (`vercel login`) na máquina do mantenedor.
- **Consequências:** Isolamento completo das credenciais pessoais do mantenedor e publicação de banco (via build da API), API e PWA em um único comando; em contrapartida, o deploy não é CD automático após merge na `main` e depende de disparo manual.
