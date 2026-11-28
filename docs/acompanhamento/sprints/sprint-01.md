# Sprint 1 — Fundação do Projeto e Autenticação

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `07/10/2026` a `18/10/2026` |
| **Objetivo** | Estruturar o monorepo, a infraestrutura local com Docker/PostgreSQL 17, o pipeline de CI e entregar o sistema completo de autenticação e gestão de sessões no Back-end; preparar ambiente, tema e protótipos no Front-end. |
| **Branch / PR Principal** | `feature/auth-user-model` $\rightarrow$ `developer` ([PR #22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22)) e refinamento modular ([PR #23](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/23)) |
| **Situação da Sprint** | Concluída ✅ |
| **Issues Atômicas Planejadas** | 8 issues técnicas (Back-end) |
| **Taxa de Conclusão (`M1`)** | **100,0%** (8/8) |

---

## 2. Planejamento e Divisão por Frente

### Back-end (`apps/api`)
A frente de Back-end assumiu a construção da espinha dorsal da aplicação (`US-01`, `US-02`, `US-03`, `C1-RF-01`, `C1-RF-02`, `C1-RNF-01` a `C1-RNF-03`):

- Criação do monorepo com **FastAPI**, **SQLModel**, **PostgreSQL 17** via Docker Compose e gerenciamento de dependências com **uv**;
- Definição do padrão arquitetural em três camadas (`router → service → repository`) com separação estrita entre modelos ORM (`models.py`) e contratos Pydantic (`schemas.py`);
- Implementação de cadastro (`POST /auth/signup`), login (`POST /auth/login`), consulta do usuário logado (`GET /auth/session/me`), renovação com rotação de refresh token (`POST /auth/refresh`) e logout (`POST /auth/logout`);
- Elaboração da documentação de passagem do contrato de autenticação para o Front-end (PRs [#13](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/13) e [#22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22)).

### Front-end (`apps/mobile`)
Seguindo o modelo defasado entre frentes, a Sprint 1 no Front-end foi dedicada ao estudo guiado da stack **React Native + Expo + TypeScript**, definição da identidade visual e prototipação das telas, preparando a equipe para consumir os endpoints de autenticação na Sprint 2.

---

## 3. Issues Planejadas e Situação Final

*(Excluídas da contagem atômica as issues guarda-chuva `#1`, `#3` e `#4`, que consolidaram os épicos da sprint.)*

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Responsável | Situação |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **[#6](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/6)** | `C1-RF-01`, `C1-RNF-01` | `[AUTH-1]` Modelo de usuário, consultas, schemas compartilhados e hash de senha (`bcrypt`) | Back-end | [#22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22) | Caio Felipe | Concluída ✅ |
| **[#7](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/7)** | `C1-RF-02` | `[AUTH-2]` Geração e validação de tokens JWT (`access` e `refresh`) | Back-end | [#22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22) | Caio Felipe / Pedro Melo | Concluída ✅ |
| **[#8](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/8)** | `C1-RF-02`, `C1-RNF-03` | `[AUTH-3]` Proteção de rotas autenticadas (`get_current_user`) e `GET /auth/session/me` | Back-end | [#16](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/16) | Pedro Melo | Concluída ✅ |
| **[#9](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/9)** | `US-01` | `[AUTH-4]` Cadastro de usuário — `POST /auth/signup` | Back-end | [#17](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/17) | José Luiz | Concluída ✅ |
| **[#10](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/10)** | `US-02` | `[AUTH-5]` Renovação de tokens com rotação de JTI — `POST /auth/refresh` | Back-end | [#15](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/15) | Caio Felipe | Concluída ✅ |
| **[#11](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/11)** | `US-02` | `[AUTH-6]` Login por *username* ou e-mail — `POST /auth/login` | Back-end | [#18](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/18) | Caio Felipe | Concluída ✅ |
| **[#12](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/12)** | `C1-RF-01`, `C1-RF-02` | `[AUTH-7]` Documentação da autenticação e conferência de contrato | Back-end / Docs | [#13](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/13), [#22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22) | Equipe Back-end | Concluída ✅ |
| **[#14](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/14)** | `US-03` | `[AUTH-8]` Logout idempotente por sessão — `POST /auth/logout` | Back-end | [#19](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/19) | José Luiz | Concluída ✅ |

*Entregas complementares integradas na sprint:* [PR #13](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/13) (`docs: add project specifics readme documentation`, Pedro Augusto) e [PR #23](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/23) (`fix: modularizar o gerenciamento de sessões`, Pedro Augusto).

---

## 4. Decisões Técnicas e de Produto Tomadas

| Decisão | Justificativa |
| :--- | :--- |
| **Arquitetura em 3 camadas (`router → service → repository`)** | Isolou protocolo HTTP, regras de negócio e SQL. Apenas o `service` executa `commit`, permitindo operações atômicas (ex.: criar usuário e sessão no mesmo commit do `signup`). Consolidada como [ADR-001](../../arquitetura/adrs.md#adr-001-arquitetura-modular-em-tres-camadas-router-service-repository). |
| **Sessão híbrida JWT + `auth_sessions` com rotação de `current_jti`** | `access_token` (15 min) permanece *stateless* para baixo custo de leitura, enquanto `refresh_token` (7 dias) consulta `auth_sessions` e rotaciona o `jti` via `UPDATE` condicional. Reapresentar um refresh antigo detecta possível roubo e derruba a sessão inteira ([ADR-002](../../arquitetura/adrs.md#adr-002-sessoes-hibridas-jwt-com-rotacao-atomica-de-refresh-token)). |
| **Multi-sessão por aparelho e logout idempotente (`204`)** | Cada login cria uma nova linha em `auth_sessions`, sem derrubar outros dispositivos. `POST /auth/logout` remove a sessão pelo `sid` e devolve sempre `204`, evitando vazar estado de tokens. |
| **Normalização de credenciais e limite de 72 bytes no `bcrypt`** | `username`, `email` e `login` passam por `strip` e minúsculas antes da validação e comparação; senhas exigem entre 8 caracteres e 72 bytes em UTF-8 para evitar truncamento silencioso do `bcrypt`. |
| **Criação inicial de tabelas via `create_all`** | Adotada provisoriamente no `lifespan` para acelerar a entrega da Sprint 1, registrada como débito técnico (`DT-01`) para posterior adoção do Alembic. |

---

## 5. Métricas GQM da Sprint

| Métrica | Fórmula | Meta | Resultado | Evidência / Análise |
| :--- | :--- | :---: | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | `(Done ÷ Planejadas) × 100` | $\ge 90\%$ | **100,0%** (8/8) | Meta atingida ✅. Todas as 8 sub-issues (`AUTH-1` a `AUTH-8`) foram concluídas e integradas à `developer` ([PR #22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22)). |
| **M2 — Taxa de Reprovação (TRT)** | `(Reprovadas ÷ Testadas) × 100` | $\le 20\%$ | **12,5%** (1/8) | Meta atingida ✅. Houve retrabalho pós-integração na modularização do subdomínio de sessões ([PR #23](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/23)) e ajuste de variáveis no CI (`6df547c`). |
| **M3 — Débito Técnico (DTA)** | Itens de débito abertos no fechamento | $\le 1$ | **1 item** (`DT-01`) | Meta atingida ✅. Único débito estrutural aberto: ausência de ferramenta de migração de banco (`create_all` provisório). |

---

## 6. Testes e Garantia da Qualidade

- **Suíte entregue:** **85 testes automatizados** passando no `pytest` no fechamento do [PR #22](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/22) (posteriormente expandidos para 104 testes em `apps/api/tests/auth/`), executando contra um **PostgreSQL 17 real em contêiner via Testcontainers**.
- **Cobertura funcional validada:** `test_security.py`, `test_tokens.py`, `test_schemas.py`, `test_repository.py`, `test_signup.py`, `test_login.py`, `test_refresh.py`, `test_logout.py` e `test_session.py`.
- **Verificação estática:** `ruff check app/ tests/` aprovado sem alertas e pipeline `api-tests.yaml` configurada no GitHub Actions.

---

## 7. Retrospectiva, Limites Conhecidos e Próximos Passos

| Aspecto | Análise |
| :--- | :--- |
| **O que funcionou bem** | A definição antecipada da arquitetura em 3 camadas e dos guias de contrato para o Front-end destravou o trabalho paralelo das sprints seguintes. |
| **Limites conhecidos registrados** | (1) `access_token` já emitido permanece válido até expirar (15 min) após logout; (2) `auth_sessions.expires_at` é gravado mas não filtrado em consultas; (3) ausência de rotina de limpeza de sessões expiradas; (4) `.env.example` continha placeholders não numéricos para expiração. |
| **Ações para a Sprint 2** | Iniciar o consumo dos endpoints de autenticação no aplicativo mobile (`apps/mobile`) e implementar os domínios de **Hábitos** e **Check-ins** no Back-end. |
