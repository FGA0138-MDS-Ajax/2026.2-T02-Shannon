# Sprint 3 — Metas & Streaks (Back-end) e Hábitos & Check-ins (Front-end)

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `25/10/2026` a `01/11/2026` |
| **Objetivo** | Implementar o motor determinístico de metas (`day`, `week`, `month`) e streaks no Back-end e entregar todas as telas e fluxos de gerenciamento de hábitos e check-ins no Front-end mobile. |
| **Branches / PRs Principais** | Back-end: `feature/goal-1-fundacao` $\rightarrow$ `developer` ([PR #77](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/77)) + listagem agrupada por dias ([PR #81](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/81))<br>Front-end: `feature/habits-data-layer` e telas ([PRs #64](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/64), [#67](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/67), [#69](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/69), [#71](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/71), [#72](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/72)) |
| **Situação da Sprint** | Concluída ✅ |
| **Issues Atômicas Planejadas** | 14 issues técnicas (8 Back-end + 6 Front-end) |
| **Taxa de Conclusão (`M1`)** | **100,0%** (14/14) |

---

## 2. Planejamento e Divisão por Frente

### Back-end (`apps/api`)
Entrega do núcleo algorítmico do produto (`US-08`, `US-11`, `US-12`, `US-14`, `US-15`):

- Criação da tabela `goals` (relação 1:1 com `habits`) e da constraint `ck_goals_period_rules`;
- Motor puro de cálculo de períodos, streaks (`current_streak`, `best_streak`), constância (`streak_started_on`, `consistent_days`) e máquina de estados (`completed`, `in_progress`, `at_risk`, `failed`, `ended`);
- Obrigatoriedade de `goal` no `POST /habits`, cálculo de progresso em lote no `GET /habits` e no `POST /check-ins`, novas rotas sob `/goals/habits/{habit_id}/goal` e `/progress`, além da listagem de check-ins agrupados por dias (`GET /check-ins`, [PR #81](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/81));
- Geração dos documentos de referência para o Front-end com cenários reais validados contra PostgreSQL (`01-contexto-logica-e-fluxo-AGENTE.md` e `02-contrato-api-AGENTE.md` da Sprint 3).

### Front-end (`apps/mobile`) *(dados factuais de Issues/PRs)*
Implementação completa dos fluxos da Sprint 2 no aplicativo móvel (`US-04` a `US-07`, `US-09`, `US-10`, `US-34`, `US-35`, `US-36`):

- Camada de serviços e tipos de hábitos e check-ins (`habits-api.ts`, `check-ins-api.ts`, `api-errors.ts`);
- Telas de listagem e criação de hábitos, detalhe/edição/encerramento/exclusão de hábito, fluxo de check-in em etapas por categoria e detalhe/edição/exclusão de check-in;
- Correção da rota `/auth/session/me` ([PR #63](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/63)) e testes das novas telas.

---

## 3. Issues Planejadas e Situação Final

*(Excluídas da contagem atômica as issues guarda-chuva `#47` e `#48`.)*

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Responsável | Situação |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **[#55](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/55)** | `C2-RF-05` | `[GOAL-1]` Fundação das metas: modelo `Goal`, schemas, fábricas e data fixa nos testes | Back-end | [#77](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/77) | Caio Felipe | Concluída ✅ |
| **[#56](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/56)** | `US-11`, `US-12`, `US-14` | `[GOAL-2]` Motor de streak: períodos, progresso e constância (funções puras) | Back-end | [#65](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/65) | Caio Felipe | Concluída ✅ |
| **[#57](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/57)** | `US-04`, `US-08` | `[GOAL-3]` Meta obrigatória na criação do hábito e `goal` nas respostas | Back-end | [#75](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/75) | Caio Felipe | Concluída ✅ |
| **[#58](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/58)** | `US-08` | `[GOAL-4]` Definir ou editar a meta — `PUT /goals/habits/{habit_id}/goal` | Back-end | [#66](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/66) | José Luiz | Concluída ✅ |
| **[#59](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/59)** | `US-15` | `[GOAL-5]` Progresso da meta — `GET /goals/habits/{habit_id}/progress` | Back-end | [#70](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/70) | José Luiz | Concluída ✅ |
| **[#60](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/60)** | `US-05`, `US-15` | `[GOAL-6]` Progresso de cada hábito na lista — `GET /habits` | Back-end | [#74](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/74) | Pedro Melo | Concluída ✅ |
| **[#61](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/61)** | `US-09`, `C3-RNF-04` | `[GOAL-7]` Progresso atualizado na resposta do check-in — `POST /check-ins` | Back-end | [#73](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/73) | João Sauma | Concluída ✅ |
| **[#62](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/62)** | QA | `[GOAL-8]` Testes de integração principais de metas e streaks | Back-end / QA | [#76](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/76) | João Sauma | Concluída ✅ |
| **[#49](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/49)** | `C2-RF-03`–`04`, `C3-RF-06` | Camada de dados de hábitos e check-ins | Front-end | [#64](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/64) | Breno Gomes | Concluída ✅ |
| **[#50](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/50)** | `US-04`, `US-05` | Lista e criação de hábitos | Front-end | [#67](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/67) | Isaque Palhares | Concluída ✅ |
| **[#51](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/51)** | `US-06`, `US-07`, `US-35` | Detalhe, edição, encerramento e exclusão de hábito | Front-end | [#69](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/69) | Isaque Palhares | Concluída ✅ |
| **[#52](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/52)** | `US-09`, `US-34` | Fluxo de check-in em etapas | Front-end | [#72](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/72) | Breno Gomes | Concluída ✅ |
| **[#53](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/53)** | `US-10`, `US-36` | Detalhe, edição e exclusão de check-in | Front-end | [#71](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/71) | Isaque Palhares | Concluída ✅ |
| **[#54](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/54)** | QA | Testes das telas de hábitos e check-ins | Front-end / QA | [#64](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/64), [#72](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/72) | Equipe Front-end / QA | Concluída ✅ |

*Entrega complementar:* [PR #81](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/81) (`feat: list checkins grouped by days`, Pedro Augusto) adicionou `GET /check-ins` agrupado por datas no fuso de São Paulo.

---

## 4. Decisões Técnicas e de Produto Tomadas (Back-end)

| Decisão | Justificativa |
| :--- | :--- |
| **Streak e progresso calculados sob demanda (sem colunas mutáveis)** | Elimina a necessidade de *cron jobs* à meia-noite e garante correção automática quando um check-in é excluído ou editado ([ADR-003](../../arquitetura/adrs.md#adr-003-motor-de-metas-e-streaks-calculado-sob-demanda)). |
| **Meta obrigatória na criação de hábito (`day`, `week`, `month`)** | Sem meta não existe streak; o usuário escolhe explicitamente o período sem padrão implícito. `period_end_weekday` segue o padrão ISO (`1 = segunda ... 7 = domingo`) e `month` aceita de 1 a 28 dias (`D-01`). |
| **Editar a meta reinicia `starts_on` para hoje (`D-12`)** | Recalcular o histórico antigo com uma regra nova distorceria o recorde. Enviar exatamente a mesma meta no `PUT` é idempotente e preserva `starts_on`. |
| **Progresso embutido em lote em `GET /habits` e `POST /check-ins`** | Evita N+1 chamadas no app ao abrir a lista ou logo após registrar um check-in multi-hábito. |
| **Prefixo `/goals/habits/...` para rotas de metas** | Divergência intencional registrada em relação às issues iniciais (que citavam `/habits/{id}/goal`), isolando o roteador do módulo `app/goals/`. |
| **Período aberto incompleto nunca zera o streak** | Apenas um período **já fechado** e não cumprido quebra a sequência; metas diárias sem check-in hoje nascem com `status: "at_risk"` para sinalizar urgência. |

---

## 5. Métricas GQM da Sprint

| Métrica | Fórmula | Meta | Resultado | Evidência / Análise |
| :--- | :--- | :---: | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | `(Done ÷ Planejadas) × 100` | $\ge 90\%$ | **100,0%** (14/14) | Meta atingida ✅. Todas as 8 issues de metas/streaks no Back-end e 6 de hábitos/check-ins no Front-end concluídas. |
| **M2 — Taxa de Reprovação (TRT)** | `(Reprovadas ÷ Testadas) × 100` | $\le 20\%$ | **14,3%** (2/14) | Meta atingida ✅. Dois itens exigiram ajuste em testes/revisão: formato de `progress` no `POST /check-ins` e alertas de Ruff em `GOAL-7`/`GOAL-8` (`9d86d6a`, `9291c50`, `0beb543`) e limpeza de estado no formulário mobile (`2338f19`). |
| **M3 — Débito Técnico (DTA)** | Itens de débito abertos no fechamento | $\le 1$ | **1 item** (`DT-01`) | Meta atingida ✅. `DT-02` foi **quitado** com a expansão das suítes de testes (`GOAL-8`, [PR #76](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/76)). Permaneceu apenas `DT-01` (migrações Alembic), programado para a Sprint 4. |

---

## 6. Testes e Garantia da Qualidade

- **Back-end:** **111 funções de teste** no `pytest` (incluindo testes unitários parametrizados em `tests/goals/unit/test_streak.py` e suítes de integração `test_goal_create.py`, `test_goal_update.py`, `test_goal_progress.py`, `test_goal_list_and_check_in.py` e `test_check_in_list.py`), validadas com cenários reais de virada de fuso horário, semanas cruzando mês/ano e exclusão retroativa de check-ins.
- **Front-end:** adicionados testes de fluxo completo de check-in (`check-in.test.tsx`), serviços (`habits-check-ins-api.test.ts`, `api-errors.test.ts`) e utilitários de duração ISO 8601 (`duration.test.ts`).

---

## 7. Retrospectiva, Limites Conhecidos e Próximos Passos

| Aspecto | Análise |
| :--- | :--- |
| **O que funcionou bem** | Fatiamento granular das entregas (`GOAL-1` a `GOAL-8` e `#49` a `#54`) permitiu trabalho paralelo sem gargalos e manteve 100% de conclusão com quitação do débito de testes (`DT-02`). |
| **Limites conhecidos** | Fuso horário fixo em `America/Sao_Paulo` para todos os usuários; primeira semana/mês de meta criada no fim do período pode nascer `failed`; hábitos antigos sem meta retornam `goal: null` e `progress: null`. |
| **Ações para a Sprint 4** | Quitar `DT-01` com **Alembic** (`STAT-2`), entregar o módulo de **Estatísticas e Calendário** no Back-end e consumir **Metas e Progresso** no Front-end. |
