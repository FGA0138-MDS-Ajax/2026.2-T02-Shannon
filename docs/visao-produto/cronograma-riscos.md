# 3. Cronograma de Sprints, Gerenciamento de Riscos e Replanejamento

Esta seção apresenta o planejamento iterativo do projeto **HABBIT** (com a estratégia de antecipação da API em uma sprint em relação ao aplicativo móvel), a matriz de riscos atualizada até a **Versão 4.0** e os gatilhos formais de replanejamento.

---

## 3.1. Planejamento das Fases e Iterações do Projeto

!!! info "Estratégia de Desacoplamento entre Back-end e Front-end"
    A partir da **Sprint 1**, o **Back-end antecipa cada entrega em uma sprint**, permitindo que o **Front-end consuma, na sprint imediatamente seguinte, contratos REST já estáveis, testados e documentados no OpenAPI**. Embora o plano inicial previsse fechamento às quartas-feiras, a equipe adotou o fechamento efetivo entre sexta-feira à noite e o fim de semana para consolidar revisões e testes. O detalhamento completo de cada iteração está em **[Acompanhamento de Sprints](../acompanhamento/index.md)**.

### Quadro 4 — Planejamento e Acompanhamento das Sprints (Atualizado na v4.0)

| Sprint | Período Real | Entregas Back-end (BE e QA) | Entregas Front-end (FE e QA) | Conclusão (`M1`) |
| :---: | :---: | :--- | :--- | :---: |
| **[Sprint 1](../acompanhamento/sprints/sprint-01.md)** | `07/10` – `18/10` | **Base do projeto e autenticação:** Monorepo, Docker Compose (PostgreSQL 17), CI/CD, arquitetura em camadas (`Router`, `Service`, `Repository`); `US-01` a `US-03` (`signup`, `login`, `refresh`, `logout` e `/auth/session/me`). | Estudo guiado da stack React Native/Expo, configuração do ambiente mobile, tema visual e protótipos de tela. | **100,0%** |
| **[Sprint 2](../acompanhamento/sprints/sprint-02.md)** | `19/10` – `24/10` | **Hábitos e check-ins:** `US-04` a `US-07`, `US-35` (CRUD completo e encerramento com 16 categorias fixas); `US-09`, `US-10`, `US-34`, `US-36` (check-ins N:N, duração ISO 8601, filtros por categoria, edição e exclusão). | **Autenticação:** `US-01` a `US-03` (telas de cadastro, login e logout, `AuthContext`, interceptors Axios com fila de refresh e `expo-secure-store` / `localStorage`). | **100,0%** |
| **[Sprint 3](../acompanhamento/sprints/sprint-03.md)** | `25/10` – `01/11` | **Metas e motor de streaks:** `US-08`, `US-11` a `US-15` (módulo `goals` com períodos `day`, `week` e `month`, `period_end_weekday`, `starts_on`, `ProgressStatus`, progresso em lote no `GET /habits` e `POST /check-ins`, e `GET /check-ins` agrupado por dias). | **Hábitos e check-ins:** `US-04` a `US-07`, `US-35`, `US-09`, `US-10`, `US-34`, `US-36` (listagem, criação, detalhe/edição/encerramento/exclusão de hábito, fluxo de check-in em etapas e detalhe/edição de check-in). | **100,0%** |
| **[Sprint 4](../acompanhamento/sprints/sprint-04.md)** | `02/11` – `10/11` | **Estatísticas, calendário e Alembic:** `US-13`, `US-16`, `US-17` (migrações **Alembic**, `users.statistics_is_public`, módulo `statistics` com `/user/statistics`, `/user/statistics/habits/{id}` e `/calendar`). | **Metas, progresso e SWR:** `US-08`, `US-11` a `US-15`, `US-27` (criação e edição de metas, progresso/streaks na listagem e pós check-in, **SWR** e tela do usuário; testes `#98` concluídos na abertura da S5). | **93,8%** |
| **[Sprint 5](../acompanhamento/sprints/sprint-05.md)** | `10/11` – `17/11` | **Grupos e competição (concluído em `feature/grp-1-fundacao`, PR `#148`):** `US-18` a `US-24`, `US-30` (21 rotas sob `/groups`: grupos multi-hábito, até 30 membros com `SELECT ... FOR UPDATE`, sucessão de admin, convite por código de 8 caracteres, feed por cursor, ranking `check_ins`/`goals`, stats coletivas e por integrante `GRP-12`). | **Estatísticas na Home:** `US-16`, `US-17` (camada de dados `#132` / PR `#140` e camada visual com `react-native-svg` `#133` / PR `#142` concluídas; testes `#134` e histórico 28 dias `#141` movidos para S6). | **87,5%** |
| **[Sprint 6](../acompanhamento/sprints/sprint-06.md)** | `18/11` – *atual* | **Fotos (Cloudflare R2) e Perfil (em andamento):** `US-26` a `US-29` (`FOTO-1`–`7` com `boto3`/R2 e `CheckInPhoto`, `PERF-1`–`3` edição de perfil, troca de senha e resumo, e `QA-1`). Lembretes (`US-25`) realocados para depois. | **Fechamento da Home e Grupos:** conclusão das pendências `#134`/`#141` e início das telas de grupos e competição consumindo a API da Sprint 5. | **Em andamento** |
| **Sprint 7** | *Fechamento* | **Lembretes, consolidação e polimento:** `US-25` (conforme capacidade), quitação de débitos restantes, testes finais e fechamento da entrega. | **Perfil, fotos, lembretes e polimento:** consumo da API da Sprint 6, revisão geral de UX e apresentação final. | **Planejada** |

---

## 3.2. Gerenciamento de Riscos

### Método de Avaliação

Cada risco identificado recebe uma **Probabilidade ($P$)** e um **Impacto ($I$)**, ambos avaliados em escala inteira de `1` a `5`. O produto define o **Grau de Exposição ($E = P \times I$)**:

- **Baixo ($1 \le E \le 6$):** Monitoramento periódico;
- **Médio ($8 \le E \le 12$):** Exige **Plano de Mitigação** ativo;
- **Alto ($15 \le E \le 25$):** Exige **Plano de Mitigação** e **Plano de Contingência** formal.

### Quadro 6 — Lista de Riscos do Projeto (Atualizada na v4.0)

| ID | Risco Identificado | Prob. | Imp. | Exp. | Grau | Plano de Mitigação | Plano de Contingência | Situação (v4.0) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| **R-01** | Escopo maior do que a capacidade das sprints de desenvolvimento impede a entrega de todos os requisitos. | 5 | 4 | **20** | **Alto** | Manter a ordenação estrita por prioridade MoSCoW; medir a taxa de conclusão da sprint (`M1`) a cada ciclo e ajustar o compromisso das seguintes. | Entregar integralmente os requisitos *Must* e *Should*, transferindo os *Could* para versão posterior ao semestre com aprovação do Dono do Produto. | **Controlado com replanejamento:** Sprints 1 a 5 concluídas no Back-end (incluindo grupos, feed e ranking); na Sprint 6 priorizaram-se Fotos e Perfil, adiando Lembretes (`US-25`) após `M1 = 87,5%` na S5. |
| **R-02** | A equipe não domina React Native, Expo e TypeScript, atrasando o desenvolvimento do aplicativo móvel. | 4 | 4 | **16** | **Alto** | Alocar dedicadamente integrantes à frente móvel; concentrar estudo guiado e protótipos na Sprint 1; iniciar pelas telas de autenticação e criar componentes base reutilizáveis. | Reduzir o cenário `C7` aos requisitos *Should* e entregar os *Must* com interface simplificada. | **Mitigado:** Autenticação, hábitos, check-ins, metas, SWR e painel visual de estatísticas (`react-native-svg`) já integrados com 152 casos de teste em Jest. |
| **R-03** | Alterações no modelo de dados durante o desenvolvimento obrigam a refazer código já entregue. | 4 | 4 | **16** | **Alto** | Validar antecipadamente o modelo relacional e isolar as consultas na camada `repository` de cada módulo. | Aplicar alterações estruturais com migrações versionadas (**Alembic**), mantendo os testes de integração automatizados para detectar quebras imediatamente. | **Controlado:** **Alembic** (`apps/api/migrations/`) gerenciou com sucesso as migrações das Sprints 4 (`0ceac8027fbf`), 5 (`5c948effbeee`, grupos multi-hábito) e 6 (`CheckInPhoto`), validadas por `test_migrations.py`. |
| **R-04** | Sobrecarga acadêmica dos integrantes em períodos de provas de outras disciplinas reduz a capacidade da equipe entre outubro e novembro. | 5 | 3 | **15** | **Alto** | Mapear semanas de provas sobre o cronograma e distribuir tarefas menores e independentes (ex.: `stat-1` a `stat-9`, `grp-1` a `grp-12`, `foto-1` a `foto-7`). | Repassar itens não críticos à sprint seguinte e reordenar o backlog preservando os requisitos *Must*. | **Em monitoramento:** Fechamento estendido para sexta/fim de semana e fatiamento em sub-issues mantiveram a entrega acumulada em 95,5% (S1–S5). |
| **R-05** | Histórias de maior esforço, como o dashboard com calendário e estatísticas, não cabem em uma única sprint semanal. | 4 | 3 | **12** | **Médio** | Decompor épicos complexos em sub-tarefas menores e incrementais (fundação, cálculos unitários, rotas, integração e componentes visuais). | — | **Mitigado:** Estatísticas (`STAT-1`–`9`), Grupos (`GRP-1`–`12`) e Fotos (`FOTO-1`–`7`) foram fatiados em entregas independentes. |
| **R-06** | A equipe não domina Python e FastAPI, atrasando a implementação da API. | 3 | 4 | **12** | **Médio** | Definir na Sprint 1 a estrutura padronizada (`router`, `service`, `repository`, `schemas`, `models`, `exceptions`, `responses`) com módulo de referência. | — | **Superado:** Arquitetura modular consolidada em `auth`, `habits`, `goals`, `checkins`, `statistics` e `group` (452 funções de teste). |
| **R-07** | Dependência entre subgrupos (Back-end $\rightarrow$ Front-end) atrasa entregas encadeadas. | 4 | 3 | **12** | **Médio** | Manter o modelo defasado em que o Back-end entrega a API uma sprint antes do consumo pelo Front-end e documentar contratos no OpenAPI e guias de passagem. | — | **Controlado:** Guias de lógica e contrato gerados a cada sprint com respostas reais de PostgreSQL; pendente apenas o merge final do PR `#148` (S5) na `developer`. |
| **R-08** | Contribuição desigual entre os oito integrantes concentra o trabalho em poucas pessoas. | 3 | 4 | **12** | **Médio** | Distribuir os itens semanalmente no planejamento e acompanhar commits, branches e *Pull Requests* por integrante no GitHub. | — | **Em monitoramento:** Participação ativa dos 8 integrantes distribuída em mais de 160 PRs/Issues em todas as frentes. |
| **R-09** | O envio de notificações depende de permissões do sistema operacional móvel, podendo impactar o requisito `C6-RF-14`. | 3 | 4 | **12** | **Médio** | Planejar o gerenciamento local de notificações no módulo `Sistem Notifications` do cliente móvel com verificação explícita de permissão. | — | **Realocado:** Lembretes (`US-25`) foram movidos para depois de Fotos e Perfil (Sprint 6). |
| **R-10** | Conflitos de integração e perda de código por ausência de política de branches definida. | 3 | 3 | **9** | **Médio** | Exigir branches por feature, integração na branch `developer`, CI obrigatório (Ruff, Biome, Pytest, Jest) e revisão por par antes do merge. | — | **Controlado:** Mais de 145 PRs integrados; na S5 a equipe adotou arquivos separados por subdomínio em `app/group/` para zerar conflitos em desenvolvimento paralelo. |
| **R-11** | Requisitos mal compreendidos geram retrabalho na implementação. | 3 | 3 | **9** | **Médio** | Manter critérios de aceite objetivos nas *User Stories* e consolidar regras transversais na Tabela de Decisões de Produto (`D-01` a `D-12`). | — | **Controlado:** Divergências e limites conhecidos são documentados explicitamente ao fim de cada sprint. |
| **R-12** | Saída ou impedimento prolongado de integrante durante o semestre reduz a capacidade da equipe. | 2 | 4 | **8** | **Médio** | Evitar silos de conhecimento mantendo ao menos dois integrantes atuantes em cada subsistema e revisões cruzadas de código. | — | **Sem alteração registrada** (equipe completa com 8 integrantes). |

---

## 3.3. Critérios de Replanejamento

O replanejamento formal do projeto é acionado sempre que um dos gatilhos objetivos do Quadro 7 se verifica durante a revisão semanal da sprint.

### Quadro 7 — Gatilhos e Ações de Replanejamento

| # | Gatilho de Acionamento | Riscos Associados | Ação Decorrente Obrigatória |
| :---: | :--- | :---: | :--- |
| **1** | A Taxa de Conclusão da Sprint (`M1`) fica **abaixo de 90%** em uma sprint. | `R-01`, `R-04`, `R-05` | Reduzir o compromisso da sprint seguinte à capacidade efetivamente medida e reordenar o backlog da sprint. |
| **2** | A Taxa de Conclusão (`M1`) fica **abaixo de 90% em duas sprints consecutivas**. | `R-01`, `R-02`, `R-06` | Revisar o escopo total do semestre, despriorizando os requisitos *Could* e, se indispensável, os *Should*, preservando a entrega íntegra de 100% dos *Must*. |
| **3** | Um requisito **Must** sofre atraso superior a uma sprint. | `R-01`, `R-03` | Realocar imediatamente o requisito *Must* no topo da sprint seguinte e deslocar itens de menor prioridade. |
| **4** | Um risco de grau **Alto** se confirma. | `R-01` a `R-04` | Acionar o plano de contingência correspondente do Quadro 6 e reavaliar a alocação das sprints subsequentes. |
| **5** | Há desligamento ou impedimento prolongado de integrante. | `R-08`, `R-12` | Redistribuir as atribuições entre os membros da frente afetada e reavaliar o escopo das sprints restantes. |
| **6** | Um requisito se mostra tecnicamente inviável na tecnologia adotada. | `R-09` | Substituir o requisito por alternativa técnica que atenda ao mesmo Objetivo do Produto (Seção 1.3) ou removê-lo com aprovação do Dono do Produto. |
| **7** | Uma alteração no modelo de dados afeta funcionalidades já entregues. | `R-03` | Isolar a alteração em migração versionada pelo **Alembic**, atualizar os repositórios afetados e validar com a suíte de testes de integração antes de prosseguir. |
| **8** | O Dono do Produto altera prioridades ou solicita novo requisito. | — | Reordenar o backlog conforme a classificação MoSCoW e reavaliar as sprints ainda não iniciadas. |
