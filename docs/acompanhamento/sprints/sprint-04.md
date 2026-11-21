# Sprint 4 — Estatísticas & Alembic (Back-end) e Metas & SWR (Front-end)

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `02/11/2026` a `10/11/2026` |
| **Objetivo** | Implantar migrações versionadas com **Alembic** (quitando `DT-01`), entregar o módulo completo de **Estatísticas e Calendário Mensal** no Back-end (`/user/statistics`) e implementar criação/edição de metas, acompanhamento de progresso e cache reativo com **SWR** no Front-end. |
| **Branches / PRs Principais** | Back-end: `feature/statistics-1-fundacao` $\rightarrow$ `developer` ([PR #114](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/114))<br>Front-end: `refactor/swr-user-data` ([PR #91](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/91)) + Metas/Progresso ([PRs #99](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/99)–[#103](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/103), [#112](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/112))<br>Docs: publicação v3.0 do MkDocs ([PR #115](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/115)) |
| **Situação da Sprint** | Concluída ✅ |
| **Issues Atômicas Planejadas** | 16 issues técnicas (9 Back-end + 7 Front-end) |
| **Taxa de Conclusão (`M1`)** | **93,8%** (15/16) |

---

## 2. Planejamento e Divisão por Frente

### Back-end (`apps/api`)
Foco no cenário `C4` (`US-13`, `US-16`, `US-17`, `C4-RF-10`) e na quitação do débito técnico `DT-01` (migrações de banco):

- Adoção definitiva do **Alembic** (`apps/api/migrations/`), removendo `create_all` do `lifespan` e aplicando migrações no `CMD` do Docker (`baseline f6976b737c1c` + `0ceac8027fbf` adicionando `users.statistics_is_public`);
- Implementação de 3 novas rotas `GET` sob `/user/statistics` sem alterar nenhuma rota da Sprint 3: painel consolidado, estatísticas por hábito e calendário mensal;
- Extensão do motor `app/goals/streak.py` com `completion_dates` e `period_results`;
- Documentação de passagem para o Front-end com cenários reais validados (`01-contexto-logica-e-fluxo-AGENTE.md` e `02-contrato-api-AGENTE.md` da Sprint 4).

### Front-end (`apps/mobile`) *(dados factuais de Issues/PRs)*
Consumo da API de Metas e Streaks da Sprint 3 (`US-08`, `US-11`–`US-15`, `US-27`):

- Adoção do **SWR** para cache reativo e página de dados do usuário ([PR #91](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/91));
- Camada de dados de metas/progresso, meta na criação do hábito, acompanhamento no detalhe, edição/definição de meta, progresso na lista e progresso atualizado logo após check-in ([PRs #99–#103, #112](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/112));
- A issue de testes automatizados `#98` ficou pendente no fechamento da sprint e foi concluída no início da Sprint 5 ([PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129)).

---

## 3. Issues Planejadas e Situação Final

*(Excluídas da contagem atômica as issues guarda-chuva `#78` e `#79`, além da `#80` de documentação contínua da API.)*

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Responsável | Situação |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **[#82](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/82)** | `C4-RF-10` | `[STAT-1]` Contrato das estatísticas: módulo `app/statistics/` e `GET /user/statistics` | Back-end | [#114](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/114) | Caio Felipe | Concluída ✅ |
| **[#83](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/83)** | `R-03`, `DT-01` | `[STAT-2]` Alembic: migrações versionadas do banco e coluna `statistics_is_public` | Back-end | [#104](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/104) | Pedro Melo | Concluída ✅ |
| **[#84](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/84)** | `US-13`, `US-17` | `[STAT-3]` Blocos de check-ins, série diária e `activity_streak` | Back-end | [#105](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/105) | João Sauma | Concluída ✅ |
| **[#85](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/85)** | `US-15`, `US-17` | `[STAT-4]` Hábitos, progresso por hábito (`build_habits_progress`) e hábitos `at_risk` | Back-end | [#106](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/106), [#107](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/107) | José Luiz | Concluída ✅ |
| **[#86](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/86)** | `US-17` | `[STAT-5]` Motor: `completion_dates` e `period_results` (funções puras) | Back-end | [#108](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/108) | Caio Felipe | Concluída ✅ |
| **[#87](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/87)** | `US-17` | `[STAT-6]` Hábitos concluídos, taxa de conclusão (`goal_completion`) e `consistency` | Back-end | [#109](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/109) | José Luiz | Concluída ✅ |
| **[#88](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/88)** | `US-16` | `[STAT-7]` Calendário mensal do hábito — `GET /user/statistics/habits/{id}/calendar` | Back-end | [#110](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/110) | Pedro Melo | Concluída ✅ |
| **[#89](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/89)** | QA, `C4-RNF-05` | `[STAT-8]` Testes de integração, número fixo de consultas SQL e verificação final | Back-end / QA | [#114](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/114) | João Sauma | Concluída ✅ |
| **[#90](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/90)** | `US-17` | `[STAT-9]` Estatísticas individuais de um hábito — `GET /user/statistics/habits/{id}` | Back-end | [#111](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/111) | João Sauma | Concluída ✅ |
| **[#92](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/92)** | `C2-RF-05`, `C3-RF-07` | Camada de dados de metas e progresso | Front-end | [#99](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/99) | Isaque Palhares | Concluída ✅ |
| **[#93](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/93)** | `US-04`, `US-08` | Meta na criação de hábito | Front-end | [#100](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/100) | Isaque Palhares | Concluída ✅ |
| **[#94](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/94)** | `US-11`, `US-15` | Acompanhamento da meta no detalhe do hábito | Front-end | [#102](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/102) | Isaque Palhares | Concluída ✅ |
| **[#95](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/95)** | `US-08` | Editar e definir meta do hábito | Front-end | [#103](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/103) | Isaque Palhares | Concluída ✅ |
| **[#96](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/96)** | `US-05`, `US-15` | Progresso na lista de hábitos | Front-end | [#101](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/101) | Breno Gomes | Concluída ✅ |
| **[#97](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/97)** | `US-09`, `C3-RNF-04` | Progresso atualizado após o check-in | Front-end | [#112](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/112) | Breno Gomes | Concluída ✅ |
| **[#98](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/98)** | QA | Testes de metas e streaks no mobile | Front-end / QA | [#129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129) *(S5)* | Isaque Esteves | Pendente *(fechada na S5)* 🟡 |

---

## 4. Decisões Técnicas e de Produto Tomadas (Back-end)

| Decisão | Justificativa |
| :--- | :--- |
| **Adoção do Alembic no `CMD` do Docker e remoção de `create_all`** | Garante evolução versionada e auditável do PostgreSQL, impede a API de subir com schema inconsistente e quita o risco `R-03` e o débito `DT-01` ([ADR-005](../../arquitetura/adrs.md#adr-005-adocao-de-alembic-e-colunas-varchar-com-check-constraints)). |
| **Estatísticas calculadas sob demanda e restritas ao próprio dono (`404`)** | Garante consistência imediata após exclusões ou edições de check-ins. Hábitos de terceiros (inclusive públicos) retornam `404`; a coluna `users.statistics_is_public` foi preparada no banco para perfil/feed futuros, sem exposição ainda. |
| **Escala de `rate` em percentual (`0..100`, 1 casa decimal) e `total_periods: 0` = sem dados** | Padronizado diretamente para exibição no app (`87.5` = `87,5%`), evitando confusão com frações (`0.875`) e distinguindo "sem dados ainda" de "0% de cumprimento". |
| **Separação estrita entre check-ins (eventos) e dias** | `check_ins.*` e `series.points[].count` contam linhas de check-in (inclusive de hábitos excluídos); `done`, streaks, taxa e `activity_streak` contam dias distintos no fuso `America/Sao_Paulo`. |
| **Consultas SQL constantes (5 a 7 queries por requisição)** | Validado por testes que comparam 1 hábito com 10 hábitos, assegurando ausência de N+1 e aderência ao `C4-RNF-05` (P95 $\le$ 500 ms). |
| **Hábito sem meta: estatísticas `200` (`progress: null`) vs. calendário `404`** | Permite ao app exibir o histórico de check-ins nas estatísticas do hábito e, no calendário, oferecer diretamente a ação "Definir meta". |

---

## 5. Métricas GQM da Sprint

| Métrica | Fórmula | Meta | Resultado | Evidência / Análise |
| :--- | :--- | :---: | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | `(Done ÷ Planejadas) × 100` | $\ge 90\%$ | **93,8%** (15/16) | Meta atingida ✅. Back-end fechou **100%** (9/9) e Front-end entregou 6/7 funcionalidades (`#98` de testes foi concluída na abertura da Sprint 5 via [PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129)). |
| **M2 — Taxa de Reprovação (TRT)** | `(Reprovadas ÷ Testadas) × 100` | $\le 20\%$ | **13,3%** (2/15) | Meta atingida ✅. Dois ajustes pós-verificação: validação de anos limite (`0000`/`9999`) no calendário `STAT-7` (`6fb6054`) e limpeza de estado de *retry* no detalhe do hábito mobile (`4ce8782`). |
| **M3 — Débito Técnico (DTA)** | Itens de débito abertos no fechamento | $\le 1$ | **1 item** (`DT-03`) | Meta atingida ✅. `DT-01` (migrações Alembic) foi **quitado** ([PR #104](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/104)); abriu-se apenas `DT-03` (testes mobile `#98`), quitado logo na Sprint 5. |

---

## 6. Testes e Garantia da Qualidade

- **Back-end:** **196 funções de teste** (**233 casos coletados** pelo `pytest`, além de 1 teste de desempenho opt-in `RUN_PERF` com 2 anos de histórico), cobrindo `test_migrations.py`, `tests/goals/unit/test_streak_statistics.py`, `tests/statistics/unit/test_calculations.py` e 8 arquivos de integração em `tests/statistics/`.
- **Front-end:** adicionadas suítes para `user.test.tsx`, `calendar.test.tsx`, `habit-creation.test.tsx`, `habit-detail.test.tsx`, `habit-goal.test.tsx`, `habits-list.test.tsx`, `goal-progress.test.tsx`, `habit-card.test.tsx` e `check-in-progress.test.ts` (finalizadas no [PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129)).

---

## 7. Retrospectiva, Limites Conhecidos e Próximos Passos

| Aspecto | Análise |
| :--- | :--- |
| **O que funcionou bem** | Adoção tranquila do Alembic com testes de `upgrade`/`downgrade`, zero quebra de contrato com a Sprint 3 (validado por diff de OpenAPI) e publicação inicial do site MkDocs v3.0 ([PR #115](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/115)). |
| **Divergências / Limites conhecidos** | Em `goal_completion` e `consistency`, períodos semanais ou mensais em andamento cujo `end` é posterior a hoje só entram na taxa no último dia do período, mesmo se já cumpridos; `statistics_is_public` ainda não é exposta por nenhuma rota. |
| **Ações para a Sprint 5** | Quitar `DT-03` (`#98`), entregar o módulo completo de **Grupos e Competição** no Back-end (`GRP-1`–`GRP-12`) e implementar o painel de **Estatísticas na Home** no Front-end. |
