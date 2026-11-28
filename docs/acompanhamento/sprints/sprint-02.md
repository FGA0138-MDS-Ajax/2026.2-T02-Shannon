# Sprint 2 — Hábitos & Check-ins (Back-end) e Autenticação (Front-end)

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `19/10/2026` a `24/10/2026` |
| **Objetivo** | Entregar os 13 endpoints de CRUD de hábitos e check-ins multi-hábito no Back-end (incluindo o *Could* antecipado de duração ISO 8601) e implementar o fluxo completo de autenticação e persistência de tokens no Front-end mobile. |
| **Branches / PRs Principais** | Back-end: `feature/hab-1-fundacao` $\rightarrow$ `developer` ([PR #46](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/46))<br>Front-end: `feat/auth-mobile` $\rightarrow$ `developer` ([PR #34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34)) |
| **Situação da Sprint** | Concluída com atenção em M3 ⚠️ |
| **Issues Atômicas Planejadas** | 13 issues técnicas (8 Back-end + 5 Front-end) |
| **Taxa de Conclusão (`M1`)** | **100,0%** (13/13) |

---

## 2. Planejamento e Divisão por Frente

### Back-end (`apps/api`)
Foco nos cenários `C2` (Gestão de Hábitos) e `C3` (Registro de Check-ins), além da antecipação estratégica de `US-34` (*Could* — duração ISO 8601):

- Modelagem das tabelas `habits`, `check_ins` e da associativa `check_in_habits` (relação N:N);
- Implementação de 6 rotas de hábitos (`/habits`), 5 rotas de check-ins (`/check-ins` e `/habits/{id}/check-ins`) e 2 rotas de apoio ao fluxo guiado da tela de check-in (`/check-ins/categories` e `/check-ins/habit-options`);
- Documentação de passagem do contrato de hábitos e check-ins para o Front-end.

### Front-end (`apps/mobile`) *(dados factuais de Issues/PRs)*
Consumo integral da API de autenticação entregue na Sprint 1 (`US-01`, `US-02`, `US-03`):

- Cliente HTTP Axios com armazenamento seguro de tokens (`expo-secure-store` / `localStorage`) e fila de renovação em caso de `HTTP 401`;
- `AuthProvider`, hooks de sessão e restauração automática ao abrir o app;
- Telas de login, cadastro e logout com testes unitários e de componente.

*(Decisões detalhadas de design/UX do Front-end podem ser complementadas posteriormente pela frente mobile.)*

---

## 3. Issues Planejadas e Situação Final

*(Excluídas da contagem atômica as issues guarda-chuva `#2`, `#20` e `#21`.)*

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Responsável | Situação |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **[#24](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/24)** | `C2-RF-03`, `C3-RF-06` | `[HAB-1]` Fundação: modelos `Habit`, `CheckIn`, `CheckInHabit`, regras de acesso e base de testes | Back-end | [#46](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/46) | Caio Felipe | Concluída ✅ |
| **[#25](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/25)** | `US-04`, `US-05` | `[HAB-2]` Criar, listar e consultar hábitos (`POST`, `GET /habits`, `GET /habits/{id}`) | Back-end | [#38](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/38) | Pedro Melo | Concluída ✅ |
| **[#26](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/26)** | `US-06`, `US-07`, `US-35` | `[HAB-3]` Atualizar, encerrar e excluir hábitos (`PATCH`, `finish`, `DELETE`) | Back-end | [#42](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/42) | José Luiz | Concluída ✅ |
| **[#27](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/27)** | `US-09`, `US-34` | `[HAB-4]` Registrar check-in multi-hábito (`POST /check-ins`) com duração ISO 8601 | Back-end | [#41](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/41) | Caio Felipe | Concluída ✅ |
| **[#28](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/28)** | `US-10`, `US-36` | `[HAB-5]` Consultar, editar e excluir check-in (`GET`, `PATCH`, `DELETE /check-ins/{id}`) | Back-end | [#40](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/40) | Pedro Melo | Concluída ✅ |
| **[#29](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/29)** | `C3-RF-06` | `[HAB-6]` Histórico de check-ins de um hábito (`GET /habits/{id}/check-ins`) | Back-end | [#44](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/44) | José Luiz | Concluída ✅ |
| **[#36](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/36)** | `US-09`, `C3-RNF-04` | `[HAB-7]` Opções da tela de check-in (`GET /check-ins/categories` e `/habit-options`) | Back-end | [#39](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/39) | João Sauma | Concluída ✅ |
| **[#37](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/37)** | QA | `[HAB-8]` Testes automatizados principais de hábitos e check-ins | Back-end / QA | [#45](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/45) | João Sauma | Concluída ✅ |
| **[#30](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/30)** | `US-02` | Cliente da API e armazenamento seguro de tokens | Front-end | [#34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34) | Breno Gomes / Pedro Augusto | Concluída ✅ |
| **[#31](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/31)** | `US-02` | `AuthProvider`, hooks e restauração de sessão | Front-end | [#34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34) | Equipe Front-end | Concluída ✅ |
| **[#32](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/32)** | `US-02` | Tela de login | Front-end | [#34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34) | Equipe Front-end | Concluída ✅ |
| **[#33](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/33)** | `US-01`, `US-03` | Tela de cadastro e logout | Front-end | [#34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34) | Equipe Front-end | Concluída ✅ |
| **[#5](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/5)** | QA | Testes unitários e de integração da autenticação mobile | Front-end / QA | [#34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34) | Isaque Esteves | Concluída ✅ |

---

## 4. Decisões Técnicas e de Produto Tomadas (Back-end)

| Decisão | Justificativa |
| :--- | :--- |
| **Relação N:N `check_in_habits` (1 a 20 hábitos) com preservação do histórico** | Uma mesma atividade pode atender múltiplos hábitos. Excluir um hábito apaga apenas os vínculos via `ON DELETE CASCADE`, preservando os registros em `check_ins` ([ADR-004](../../arquitetura/adrs.md#adr-004-relacao-nn-entre-check-ins-e-habitos-com-preservacao-de-historico), `D-11`). |
| **Recusa transacional "tudo ou nada" com precedência `404 > 403 > 409`** | Se qualquer hábito enviado no `POST /check-ins` for inválido, de terceiro ou encerrado, nada é gravado e a API devolve o motivo mais grave acompanhado da lista `habit_ids` causadora (`D-10`). |
| **Catálogo de 16 categorias fixas em `VARCHAR` (sem padrão)** | Exigir escolha explícita evita que hábitos caiam silenciosamente em `outros`. Armazenar como `VARCHAR` (validado pelo Enum no Pydantic) dispensa `ALTER TYPE` no PostgreSQL ([ADR-005](../../arquitetura/adrs.md#adr-005-adocao-de-alembic-e-colunas-varchar-com-check-constraints), `D-08`). |
| **Privacidade por `404` e `CHECK ck_habits_status_finished_at`** | Hábitos ou check-ins privados de terceiros retornam `404` (nunca `403`) para não revelar existência. A constraint de banco garante que `status = 'FINISHED'` sempre possua `finished_at` preenchido. |
| **Fuso `America/Sao_Paulo` para datas de hábito + validador `NoNul`** | Evita virada antecipada de data às 21h em Brasília (UTC). O validador `NoNul` bloqueia `\x00` antes do PostgreSQL (evitando HTTP 500) e deve ficar **após** `StringConstraints` para não aceitar textos compostos apenas por espaços. |
| **Antecipação de `US-34` (Duração ISO 8601) e fluxo guiado de check-in** | `duration` (`INTERVAL` no PG) foi incorporado já na criação de `check_ins` para evitar retrabalho posterior. As rotas `categories` e `habit-options` (`preselected`, `ORDER BY name, id`) viabilizaram o fluxo em etapas do app sem gravar estado intermediário no servidor. |

---

## 5. Métricas GQM da Sprint

| Métrica | Fórmula | Meta | Resultado | Evidência / Análise |
| :--- | :--- | :---: | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | `(Done ÷ Planejadas) × 100` | $\ge 90\%$ | **100,0%** (13/13) | Meta atingida ✅. Todas as 8 issues de Back-end e 5 de Front-end foram integradas à `developer` ([PR #46](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/46) e [PR #34](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/34)). |
| **M2 — Taxa de Reprovação (TRT)** | `(Reprovadas ÷ Testadas) × 100` | $\le 20\%$ | **15,4%** (2/13) | Meta atingida ✅. Dois defeitos detectados em revisão/integração: ordem do validador `NoNul` aceitando espaços vazios ([PR #43](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/43) / commit `493638f`) e divergência na rota `/auth/session/me` na integração mobile ([PR #63](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/63)). |
| **M3 — Débito Técnico (DTA)** | Itens de débito abertos no fechamento | $\le 1$ | **2 itens** (`DT-01`, `DT-02`) | **Meta violada ⚠️.** Manteve-se `DT-01` (ausência de Alembic) e abriu-se `DT-02` (cobertura reduzida de testes automatizados para casos de borda de hábitos/check-ins, registrada no documento da sprint). |

!!! warning "Ação Corretiva Aplicada (M3 > 1)"
    Conforme a política do GQM, a equipe priorizou o fortalecimento da suíte automatizada na Sprint 3 (`GOAL-8`) para quitar `DT-02` e planejou a adoção formal do Alembic (`DT-01`) para a etapa seguinte.

---

## 6. Testes e Garantia da Qualidade

- **Back-end:** total de **114 testes automatizados** (`104` em `tests/auth/`, `2` em `tests/habits/test_habits.py` e `8` em `tests/checkins/`), além de verificação manual dos casos de borda durante as revisões dos PRs `#38` a `#45`.
- **Front-end:** adicionadas as suítes `auth-context.test.tsx`, `api.test.ts` e `token-storage.test.ts` com Jest e React Native Testing Library.

---

## 7. Retrospectiva, Limites Conhecidos e Próximos Passos

| Aspecto | Análise |
| :--- | :--- |
| **O que funcionou bem** | Integração limpa de 13 rotas no Back-end em uma única semana com resposta de privacidade sem N+1 (`build_check_ins_public` em 2 queries fixas) e entrada do Front-end em ritmo produtivo. |
| **Dificuldades / Limites conhecidos** | (1) Bug sutil na ordem de `NoNul` com `StringConstraints` (corrigido antes do merge); (2) cobertura automatizada inicial ainda enxuta em hábitos/check-ins (`DT-02`); (3) ausência de paginação em `GET /habits/{id}/check-ins` e necessidade de dropar tabelas manualmente sem Alembic (`DT-01`). |
| **Ações para a Sprint 3** | Implementar o motor de **Metas e Streaks** no Back-end (`GOAL-1`–`GOAL-8`), expandir testes automatizados (quitando `DT-02`) e desenvolver as telas de Hábitos e Check-ins no Front-end. |
