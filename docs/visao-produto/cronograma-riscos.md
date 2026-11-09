# 3. Cronograma de Sprints, Gerenciamento de Riscos e Replanejamento

Esta seção apresenta o planejamento iterativo do projeto **HABBIT** (com a estratégia de antecipação da API em uma sprint em relação ao aplicativo móvel), a matriz de riscos atualizada até a **Versão 3.0** e os gatilhos formais de replanejamento.

---

## 3.1. Planejamento das Fases e Iterações do Projeto

!!! info "Estratégia de Desacoplamento entre Back-end e Front-end"
    A partir da **Sprint 1**, o **Back-end antecipa cada entrega em uma sprint**, permitindo que o **Front-end consuma, na sprint imediatamente seguinte, contratos REST já estáveis, testados e documentados no OpenAPI**. Cada sprint tem duração semanal, com fechamento às quartas-feiras.

### Quadro 4 — Planejamento e Acompanhamento das Sprints (Atualizado na v3.0)

| Sprint | Data Início | Data Fim | Entregas Back-end (BE e QA) | Entregas Front-end (FE e QA) | % Conclusão |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **Sprint 1** | `07/10/2026` | `14/10/2026` | **Base do projeto e autenticação:** Repositório monorepo, Docker Compose (PostgreSQL 17), pipelines de CI/CD, estrutura em camadas (`Router`, `Service`, `Repository`); `US-01`, `US-02`, `US-03` (`signup`, `login`, `refresh`, `logout` e `/auth/session/me`). | Estudo guiado da stack React Native/Expo, configuração do ambiente mobile, tema visual e protótipos de tela. | **100%** |
| **Sprint 2** | `15/10/2026` | `21/10/2026` | **Hábitos e check-ins:** `US-04`, `US-05`, `US-06`, `US-07`, `US-35` (CRUD completo e encerramento de hábitos com 16 categorias fixas); `US-09`, `US-10`, `US-34`, `US-36` (check-ins N:N com hábitos, duração ISO 8601, filtros por categoria, edição e exclusão). | **Autenticação:** `US-01`, `US-02`, `US-03` (telas de cadastro, login e logout, contexto de sessão, interceptors Axios de refresh e armazenamento seguro via `expo-secure-store` / `localStorage`). | **100%** |
| **Sprint 3** | `22/10/2026` | `28/10/2026` | **Metas e motor de streaks:** `US-08`, `US-11`, `US-12`, `US-13`, `US-14` (módulo `goals` com períodos `day`, `week` e `month`, `period_end_weekday`, `starts_on`, máquina de estados `GoalProgress`, listagem de hábitos com progresso em lote e retorno do progresso no `POST /check-ins`). | **Hábitos e check-ins:** `US-04` a `US-07`, `US-35`, `US-09`, `US-10`, `US-34`, `US-36` (listagem e criação de hábitos, tela de detalhe/edição/encerramento/exclusão de hábito, fluxo de check-in em etapas por categoria e tela de detalhe/edição/exclusão de check-in). | **100%** |
| **Sprint 4** | `29/10/2026` | `04/11/2026` | **Estatísticas, painel e calendário:** `US-15`, `US-16`, `US-17` (migrações **Alembic**, coluna `statistics_is_public` em `users`, módulo `statistics` com `GET /user/statistics` nos modos `calendar` e `rolling` e `GET /user/statistics/habits/{id}/calendar`). | **Metas, progresso e SWR:** `US-08`, `US-11` a `US-15` (criação e edição de metas diária/semanal/mensal, acompanhamento visual de progresso e streaks na listagem de hábitos, adoção do **SWR** para cache reativo e página de informações do usuário). | **100%** |
| **Sprint 5** | `05/11/2026` | `11/11/2026` | **Grupos e competição (em andamento):** `US-18` a `US-24` (módulo `group` para criação de grupos, adição/remoção/promoção de membros e ranking de check-ins nos últimos 30 dias) e consolidação final das rotas de estatísticas. | **Estatísticas e calendário (em andamento):** `US-16`, `US-17` (integração do componente de calendário mensal e telas de estatísticas/gráficos consumindo `/user/statistics`). | **Em andamento** |
| **Sprint 6** | `12/11/2026` | `18/11/2026` | **Engajamento, perfil e fotos:** `US-25` a `US-29` (configuração de lembretes, edição de perfil do usuário e anexo de foto no check-in). | **Grupos e competição:** `US-18` a `US-24` (telas de criação de grupos, gestão de participantes, dashboard do grupo e ranking consumindo a API da Sprint 5). | **0%** |
| **Sprint 7** | `19/11/2026` | `29/11/2026` | **Itens Could, polimento e fechamento:** `US-30` a `US-33` conforme folga de cronograma (feed de atividades e agendamento por dias da semana); testes finais de carga e fechamento. | **Engajamento, perfil, fotos e polimento:** `US-25` a `US-29` (consumindo a API da Sprint 6); itens *Could* conforme folga; revisão geral de UX e preparação da apresentação final. | **0%** |

---

## 3.2. Gerenciamento de Riscos

### Método de Avaliação

Cada risco identificado recebe uma **Probabilidade ($P$)** e um **Impacto ($I$)**, ambos avaliados em escala inteira de `1` a `5`. O produto define o **Grau de Exposição ($E = P \times I$)**:

- **Baixo ($1 \le E \le 6$):** Monitoramento periódico;
- **Médio ($8 \le E \le 12$):** Exige **Plano de Mitigação** ativo;
- **Alto ($15 \le E \le 25$):** Exige **Plano de Mitigação** e **Plano de Contingência** formal.

### Quadro 6 — Lista de Riscos do Projeto (Atualizada na v3.0)

| ID | Risco Identificado | Prob. | Imp. | Exp. | Grau | Plano de Mitigação | Plano de Contingência | Situação (v3.0) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| **R-01** | Escopo maior do que a capacidade das sprints de desenvolvimento impede a entrega de todos os requisitos. | 5 | 4 | **20** | **Alto** | Manter a ordenação estrita por prioridade MoSCoW; medir a taxa de conclusão da sprint (`M1`) a cada ciclo e ajustar o compromisso das seguintes. | Entregar integralmente os requisitos *Must* e *Should*, transferindo os *Could* para versão posterior ao semestre com aprovação do Dono do Produto. | **Controlado:** Sprints 1 a 4 concluídas; motor de metas (`day`, `week`, `month`) e estatísticas entregues. |
| **R-02** | A equipe não domina React Native, Expo e TypeScript, atrasando o desenvolvimento do aplicativo móvel. | 4 | 4 | **16** | **Alto** | Alocar dedicadamente integrantes à frente móvel; concentrar estudo guiado e protótipos na Sprint 1; iniciar pelas telas de autenticação e criar componentes base reutilizáveis. | Reduzir o cenário `C7` aos requisitos *Should* e entregar os *Must* com interface simplificada. | **Mitigado:** Fluxos de autenticação, hábitos, check-in em etapas, metas, SWR e calendário já implementados e testados com Jest. |
| **R-03** | Alterações no modelo de dados durante o desenvolvimento obrigam a refazer código já entregue. | 4 | 4 | **16** | **Alto** | Validar antecipadamente o modelo relacional e isolar as consultas na camada `repository` de cada módulo. | Aplicar alterações estruturais com migrações versionadas (**Alembic**), mantendo os testes de integração automatizados para detectar quebras imediatamente. | **Materializado e Controlado:** Adotado o **Alembic** (`apps/api/alembic`) com testes automatizados de migração (`test_migrations.py`), consolidando a tabela `goals` (1:1 com `habits`) e `statistics_is_public` em `users`. |
| **R-04** | Sobrecarga acadêmica dos integrantes em períodos de provas de outras disciplinas reduz a capacidade da equipe entre outubro e novembro. | 5 | 3 | **15** | **Alto** | Mapear semanas de provas sobre o cronograma e distribuir tarefas menores e independentes (ex.: `stat-1` a `stat-7`, `goal-1` a `goal-8`). | Repassar itens não críticos à sprint seguinte e reordenar o backlog preservando os requisitos *Must*. | **Em monitoramento:** Tarefas de metas e estatísticas foram fatiadas em PRs granulares para manter o ritmo de entrega. |
| **R-05** | Histórias de maior esforço, como o dashboard com calendário e estatísticas, não cabem em uma única sprint semanal. | 4 | 3 | **12** | **Médio** | Decompor épicos complexos em sub-tarefas menores e incrementais (fundação, cálculos unitários, rotas, integração e componentes visuais). | — | **Mitigado:** O módulo de estatísticas e calendário foi dividido em 7 sub-entregas (`stat-1` a `stat-7`). |
| **R-06** | A equipe não domina Python e FastAPI, atrasando a implementação da API. | 3 | 4 | **12** | **Médio** | Definir na Sprint 1 a estrutura padronizada (`router`, `service`, `repository`, `schemas`, `models`, `exceptions`, `responses`) com módulo de referência. | — | **Superado:** Arquitetura modular consolidada em `auth`, `habits`, `goals`, `checkins` e `statistics`. |
| **R-07** | Dependência entre subgrupos (Back-end $\rightarrow$ Front-end) atrasa entregas encadeadas. | 4 | 3 | **12** | **Médio** | Manter o modelo defasado em que o Back-end entrega a API uma sprint antes do consumo pelo Front-end e documentar contratos no OpenAPI. | — | **Controlado:** Front-end consome endpoints já estabilizados e testados na branch `developer`. |
| **R-08** | Contribuição desigual entre os oito integrantes concentra o trabalho em poucas pessoas. | 3 | 4 | **12** | **Médio** | Distribuir os itens semanalmente no planejamento e acompanhar commits, branches e *Pull Requests* por integrante no GitHub. | — | **Em monitoramento:** Participação ativa em PRs de todas as frentes (API, Mobile, Testes e Docs). |
| **R-09** | O envio de notificações depende de permissões do sistema operacional móvel, podendo impactar o requisito `C6-RF-14` (Sprint 6). | 3 | 4 | **12** | **Médio** | Planejar o gerenciamento local de notificações no módulo `Sistem Notifications` do cliente móvel com verificação explícita de permissão. | — | **Sem alteração registrada** (previsto para a Sprint 6). |
| **R-10** | Conflitos de integração e perda de código por ausência de política de branches definida. | 3 | 3 | **9** | **Médio** | Exigir branches por feature, integração na branch `developer`, CI obrigatório (Ruff, Biome, Pytest, Jest) e revisão por par antes do merge. | — | **Controlado:** Mais de 90 PRs revisados e integrados na branch `developer` com pipelines de CI ativas. |
| **R-11** | Requisitos mal compreendidos geram retrabalho na implementação. | 3 | 3 | **9** | **Médio** | Manter critérios de aceite objetivos nas *User Stories* e consolidar regras transversais na Tabela de Decisões de Produto (`D-01` a `D-12`). | — | **Controlado:** Regras de negócio documentadas inclusive nas descrições OpenAPI e docstrings dos módulos. |
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
