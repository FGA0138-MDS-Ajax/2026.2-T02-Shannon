# Sprint 5 — Grupos & Competição (Back-end) e Estatísticas na Home (Front-end)

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `10/11/2026` a `17/11/2026` |
| **Objetivo** | Entregar o módulo completo de **Grupos e Competição** no Back-end (21 novas rotas sob `/groups`, migração `5c948effbeee` e adaptação das rotas existentes) e implementar o painel de **Estatísticas na Home** no Front-end mobile. |
| **Branches / PRs Principais** | Back-end: `feature/grp-1-fundacao` (PRs [#130](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/130)–[#147](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/147) integrados; consolidação para `developer` no [PR #148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148))<br>Front-end: testes da S4 ([PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129)), camada de dados ([PR #140](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/140)) e camada visual da Home ([PR #142](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/142)) |
| **Situação da Sprint** | Parcialmente concluída ⚠️ *(BE 12/12 concluídas na branch da sprint; 2 pendências no FE)* |
| **Issues Atômicas Planejadas** | 16 issues técnicas (12 Back-end + 4 Front-end) |
| **Taxa de Conclusão (`M1`)** | **87,5%** (14/16) |

---

## 2. Planejamento e Divisão por Frente

### Back-end (`apps/api`)
A Sprint 5 representou o maior salto de escopo do semestre (`US-18` a `US-24`, além da antecipação do feed de grupo `US-30` e de `GRP-12`):

- Evolução do modelo relacional via migração Alembic `5c948effbeee` (`groups`, `group_members`, `habits.author_group_id` e `CHECK ck_habits_single_author`);
- Implementação de **21 endpoints sob `/groups`** cobrindo CRUD e estado do grupo, gestão de até 30 membros com trava pessimista (`SELECT ... FOR UPDATE`), sucessão automática de admin, convite por código de 8 caracteres, hábitos do grupo, feed paginado por cursor opaco, ranking com 2 critérios (`check_ins` e `goals`), estatísticas do grupo e estatísticas por hábito/integrante (`GRP-12`);
- Adaptação de 9 grupos de rotas existentes (`/habits`, `/check-ins`, `/goals`, `/user/statistics`) para conviver com hábitos de grupo;
- Geração da documentação completa de passagem para o Front-end com gerador automatizado de cenários reais e matriz de permissões executada (`27 rotas × 3 papéis × 2 estados`).

### Front-end (`apps/mobile`) *(dados factuais de Issues/PRs)*
- Quitação da issue herdada `#98` (*Testes de metas e streaks*) no [PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129);
- Entrega da camada de dados de estatísticas da Home (`#132`, [PR #140](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/140)) e da camada visual da Home com `react-native-svg` (`#133`, [PR #142](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/142), já mergeado na `developer`);
- Ficaram pendentes para a Sprint 6 os testes automatizados da Home (`#134`) e o histórico de 28 dias / check-in rápido nos cards (`#141`, adicionada durante a sprint em `13/11`).

---

## 3. Issues Planejadas e Situação Final

*(Excluída da contagem atômica a issue guarda-chuva `#128`. A entrega `#133` foi contabilizada como concluída conforme merge efetivo do [PR #142](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/142) na `developer`.)*

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Responsável | Situação |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **[#116](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/116)** | `C5-RF-11` | `[GRP-1]` Fundação dos grupos: modelos, migração `5c948effbeee`, permissões e estado | Back-end | [#148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148) | Caio Felipe | Concluída ✅ |
| **[#117](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/117)** | `US-18` | `[GRP-2]` Criar, listar e detalhar grupo (`POST`/`GET /groups`, `GET /groups/{id}`) | Back-end | [#130](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/130) | Pedro Melo | Concluída ✅ |
| **[#118](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/118)** | `US-24` | `[GRP-3]` Editar grupo: nome, descrição, `ends_on` e critério (`PATCH /groups/{id}`) | Back-end | [#135](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/135) | João Sauma | Concluída ✅ |
| **[#119](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/119)** | `US-19`, `US-20`, `US-21` | `[GRP-4]` Membros: adicionar, remover, promover e sair com sucessão de admin | Back-end | [#136](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/136) | Pedro Melo | Concluída ✅ |
| **[#120](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/120)** | `US-19` | `[GRP-5]` Convite por código: pré-visualizar, entrar e renovar código | Back-end | [#137](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/137) | João Sauma | Concluída ✅ |
| **[#121](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/121)** | `US-18`, `US-22` | `[GRP-6]` Hábitos do grupo e contagem de dias de check-in por membro | Back-end | [#131](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/131) | Caio Felipe | Concluída ✅ |
| **[#122](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/122)** | `US-09`, `US-30` | `[GRP-7]` Check-in em hábito de grupo, opções e feed com cursor opaco | Back-end | [#138](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/138), [#139](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/139) | José Luiz | Concluída ✅ |
| **[#123](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/123)** | `US-23` | `[GRP-8]` Ranking do grupo (`check_ins` ou `goals`, desempate `1, 1, 3`) | Back-end | [#144](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/144) | José Luiz | Concluída ✅ |
| **[#124](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/124)** | `US-22` | `[GRP-9]` Estatísticas do grupo (`most_consistent`, `best_record`, `check_ins_last_7_days`) | Back-end | [#146](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/146) | Caio Felipe | Concluída ✅ |
| **[#125](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/125)** | `C2`–`C5` | `[GRP-10]` Adaptação de hábitos, metas, check-ins e estatísticas pessoais | Back-end | [#143](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/143) | Caio Felipe | Concluída ✅ |
| **[#126](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/126)** | QA | `[GRP-11]` Testes de integração, fixtures, plano de QA e documentos de fim de sprint | Back-end / QA | [#147](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/147) | João Sauma / Equipe BE | Concluída ✅ |
| **[#127](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/127)** | `US-22` | `[GRP-12]` Estatísticas de um hábito de grupo por integrante (`.../habits/{id}/stats`) | Back-end | [#145](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/145) | Pedro Melo | Concluída ✅ |
| **[#132](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/132)** | `US-16`, `US-17` | Camada de dados das estatísticas na Home | Front-end | [#140](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/140) | Isaque Palhares | Concluída ✅ |
| **[#133](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/133)** | `US-16`, `US-17` | Camada visual do painel de estatísticas da Home | Front-end | [#142](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/142) | Breno Gomes | Concluída ✅ |
| **[#134](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/134)** | QA | Testes das features de estatísticas na Home | Front-end / QA | — | Isaque Esteves | Pendente 🟡 |
| **[#141](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/141)** | `US-15`, `US-16` | Histórico de 28 dias e check-in rápido nos cards de hábito da Home | Front-end | — | Equipe Front-end | Pendente 🟡 |

---

## 4. Decisões Técnicas e de Produto Tomadas (Back-end)

| Decisão | Justificativa |
| :--- | :--- |
| **Grupos multi-hábito (`habits.author_group_id` + `CHECK ck_habits_single_author`)** | Substituiu a decisão antiga `D-05` (1 hábito por grupo). Um hábito pertence exatamente a um usuário **ou** a um grupo, permitindo desafios completos sem criar múltiplos grupos ([ADR-007](../../arquitetura/adrs.md#adr-007-grupos-multi-habito-trava-pessimista-sucessao-e-estado-sob-demanda)). |
| **Estado do grupo (`active`/`ended`) calculado sob demanda e reabertura por `PATCH`** | Grupo fica `ended` apenas quando `ends_on < hoje` (ativo no próprio `ends_on`). Estender `ends_on` reabre o grupo automaticamente sem cron jobs; ranking e estatísticas congelam em `as_of = min(hoje, ends_on)`. |
| **Trava pessimista (`SELECT ... FOR UPDATE`), limite de 30 membros e sucessão automática** | Serializa saídas simultâneas de admins e disputas pela 30ª vaga. Quando o único admin sai, o membro de menor `(joined_at, user_id)` é promovido; quando sai o último integrante, o grupo é excluído automaticamente (`200` com `LeaveResult`). |
| **Ranking pela existência inteira dos hábitos com 2 critérios trocáveis retroativamente** | Substituiu a janela fixa de 30 dias (`D-06`). O admin alterna entre `check_ins` (dias distintos) e `goals` (períodos cumpridos) sem perda de dados; empates seguem o padrão `1, 1, 3`; cada membro conta "desde a entrada" (`max(goal.starts_on, joined_at)`). |
| **Meta de hábito de grupo imutável (`409`)** | Trocar a meta reiniciaria o streak de todos os membros simultaneamente. Para mudar a regra, o admin encerra o hábito e cria outro. |
| **Feed paginado por cursor opaco (`before`/`after`) + polling 10–15 s (sem WebSocket)** | Evita duplicação/pulos de itens quando novos check-ins chegam (`(created_at, id)` como desempate) e mantém simplicidade operacional sem manter conexões persistentes ([ADR-008](../../arquitetura/adrs.md#adr-008-feed-de-grupo-com-paginacao-por-cursor-opaco-e-polling-sem-websocket)). |
| **Convite por código de 8 caracteres (sem link) e `404` para não membros** | Código do alfabeto sem caracteres ambíguos (`I`, `O`, `0`, `1`), normalizado na entrada, visível apenas a admins e renovável instantaneamente. Não membros recebem `404` em toda rota `/groups/{id}` para não vazar existência. |
| **Arquivos híbridos por feature em `app/group/` com docstrings de destino pós-sprint** | Decisão de engenharia durante a sprint para viabilizar trabalho paralelo de 4 desenvolvedores em `groups.py`, `members.py`, `invite.py`, `habits.py`, `feed.py`, `ranking.py` e `stats.py` sem conflitos de merge em arquivos centrais, mantendo docstrings indicando o destino futuro (`service.py` / `router.py`) — registrada como `DT-04`. |

---

## 5. Métricas GQM da Sprint

| Métrica | Fórmula | Meta | Resultado | Evidência / Análise |
| :--- | :--- | :---: | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | `(Done ÷ Planejadas) × 100` | $\ge 90\%$ | **87,5%** (14/16) | **Meta não atingida ⚠️.** Back-end concluiu 12/12 issues (`#116`–`#127`) e Front-end entregou `#132` ([PR #140](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/140)) e `#133` ([PR #142](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/142)), ficando `#134` e `#141` para a Sprint 6. |
| **M2 — Taxa de Reprovação (TRT)** | `(Reprovadas ÷ Testadas) × 100` | $\le 20\%$ | **14,3%** (2/14) | Meta atingida ✅. A bateria de QA `GRP-11` identificou dois bugs documentados antes da integração do app: `L1` (`progress.status` saindo `"ended"` em `GET /habits` e `GET /goals/.../progress`) e `L2` (`code` não-string retornando `500` no `POST /groups/join`). |
| **M3 — Débito Técnico (DTA)** | Itens de débito abertos no fechamento | $\le 1$ | **2 itens** (`DT-04`, `DT-05`) | **Meta violada ⚠️.** `DT-03` (`#98`) foi **quitado** ([PR #129](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/129)), porém abriram-se `DT-04` (refatoração dos arquivos híbridos de `app/group/` + correção de `L1`/`L2`) e `DT-05` (testes mobile da Home `#134`). |

!!! warning "Gatilho de Replanejamento Acionado (M1 < 90% e M3 > 1)"
    Pelo **Gatilho 1** do plano de replanejamento e pela política de **M3**, a equipe reduziu o escopo imediato da Sprint 6 (adiando **Lembretes `US-25`** para depois de Fotos e Perfil) e priorizou a quitação de `DT-04`, `DT-05` e a integração final do [PR #148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148).

---

## 6. Testes e Garantia da Qualidade

- **Back-end:** salto de 196 para **452 funções de teste** em **64 arquivos** (`apps/api/tests/group/` com 25 arquivos unitários e de integração, incluindo testes de concorrência com 5 rodadas paralelas, número de queries SQL, cursor de feed, ranking e matriz de permissões `27 × 3 × 2`).
- **Front-end:** base consolidada com **152 casos de teste** distribuídos em **25 arquivos** (incluindo `statistics-panel.test.tsx`, `statistics.test.tsx`, `useUserStatistics.test.tsx`, `statistics-api.test.ts` e `habit-history.test.ts`).

---

## 7. Retrospectiva, Limites Conhecidos e Próximos Passos

| Aspecto | Análise |
| :--- | :--- |
| **O que funcionou bem** | Estratégia de arquivos por subdomínio em `app/group/` eliminou conflitos de merge entre 4 pessoas trabalhando simultaneamente; entrega integral de 21 rotas + `GRP-12` + gerador automatizado de exemplos reais contra Postgres 17. |
| **Limites conhecidos (catálogo da S5)** | `L1`: `progress.status` de hábito de grupo sai `"ended"` em `GET /habits` e `GET /goals/.../progress` (contorno temporário via `GRP-12`); `L2`: `code` não-string dá `500` em `POST /groups/join`; `L4`: `starts_on` do grupo é apenas informativo; `L5`: `best_record` compara número cru entre unidades; `L6`: contadores de check-ins pessoais incluem check-ins de grupo; `L10`: ausência de índice composto em `check_ins (created_at, id)`. |
| **Ações para a Sprint 6** | Mergear o [PR #148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148) na `developer`, atacar `DT-04`/`DT-05` e executar **Fotos de Check-in (Cloudflare R2)** e **Perfil do Usuário** no Back-end. |
