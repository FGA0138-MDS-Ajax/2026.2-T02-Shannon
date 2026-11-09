# HABBIT — Equipe Shannon

> **Aplicativo Móvel de Acompanhamento de Hábitos, Constância por Metas e Streaks, Estatísticas e Grupos Gamificados**

Bem-vindo à documentação oficial do projeto **HABBIT**, desenvolvido pela **Equipe Shannon** na disciplina de **Métodos de Desenvolvimento de Software (MDS — FGA0138)** da **Faculdade de Ciências e Tecnologias em Engenharia (FCTE)** da **Universidade de Brasília (UnB)**, no segundo semestre de 2026 (`2026.2`).

---

## Visão Executiva

Diante da hiperconectividade digital e da proliferação de estímulos de gratificação instantânea ("dopamina barata"), jovens adultos enfrentam crescentes dificuldades para construir e sustentar rotinas saudáveis e produtivas. Levantamentos aplicados pela equipe junto ao público-alvo (18 a 30 anos) evidenciaram três barreiras centrais: **falta de motivação para manter o ritmo**, **falta de companhia** e **dificuldade em enxergar o próprio progresso**.

O **HABBIT** resolve esse cenário reunindo, em uma única experiência móvel multiplataforma (**Android**, **iOS** e **Web** via React Native com Expo), o registro ágil de execuções por **check-ins**, um motor algorítmico de **metas por período (diária, semanal e mensal)** e **streaks**, **painéis analíticos com calendário e séries temporais** e **grupos compartilhados com ranking competitivo**.

### Pilares Estratégicos

- **Check-in Ágil e Multi-hábito (`C3-RF-06`, `C3-RNF-04`):** Registro de execução em até dois toques, com título, descrição e duração opcional em formato ISO 8601 (`PT30M`, `PT1H`), vinculando de **1 a 20 hábitos** simultaneamente e retornando o progresso recalculado em uma única requisição.
- **Motor Determinístico de Metas e Streaks (`C2-RF-05`, `C3-RF-07`, `C3-RF-08`):** Suporte a metas **diárias** (`day`), **semanais** (`week`, com dia de fechamento configurável de segunda a domingo) e **mensais** (`month`, de 1 a 28 dias), avaliadas sob demanda no fuso `America/Sao_Paulo` com classificação automática de estado (`completed`, `in_progress`, `at_risk`, `failed`, `ended`).
- **Acompanhamento Visual e Estatísticas (`C4-RF-09`, `C4-RF-10`):** Consolidação em tempo real de taxas de cumprimento de metas, sequência de atividade geral (*activity streak*), alerta de hábitos em risco (*at risk*), série temporal diária (janelas `calendar` ou `rolling` de 1 a 365 dias) e calendário mensal por hábito.
- **Segurança Híbrida de Sessão (`C1-RF-02`, `C1-RNF-01`):** Senhas protegidas exclusivamente com *hash* **bcrypt** e sessões persistidas no banco (`auth_sessions`) com rotação atômica de identificador (`current_jti`) do *refresh token* e detecção imediata de reuso.
- **Engajamento Social e Competição Saudável (`C5-RF-11` a `C5-RF-13`):** Prática coletiva de hábitos em grupos com papéis cumulativos de Membro e Administrador e ranking nos últimos 30 dias.

---

## Os 7 Cenários Funcionais do Produto

1. **C1 — Acesso e Conta:** Cadastro de usuário (`signup`), autenticação por *username* ou e-mail (`login`), renovação atômica de sessão (`refresh`), consulta do usuário logado (`/auth/session/me`) e encerramento idempotente (`logout`).
2. **C2 — Gestão de Hábitos e Metas:** Criação, listagem com progresso embutido, edição parcial (`PATCH`), encerramento preservando histórico (`finish`), exclusão definitiva (`DELETE`) e configuração de metas (`PUT /goals/habits/{id}/goal`).
3. **C3 — Registro e Constância:** Fluxo de check-in em etapas filtrando por categorias ativas (`/check-ins/categories`) e opções paginadas (`/check-ins/habit-options`), listagem agrupada por dias, edição/exclusão e cálculo de *current streak*, *best streak* e *consistent days*.
4. **C4 — Acompanhamento do Progresso:** Painel diário de hábitos, estatísticas consolidadas (`/user/statistics`) e calendário mensal de cumprimento (`/user/statistics/habits/{id}/calendar`).
5. **C5 — Hábitos em Grupo:** Criação de grupos em torno de hábitos compartilhados, gestão de membros e ranking de constância de 30 dias.
6. **C6 — Engajamento e Lembretes:** Notificações locais e lembretes inteligentes condicionados à pendência da meta no período corrente.
7. **C7 — Comunidade e Personalização:** Gestão do perfil do usuário, privacidade das estatísticas (`statistics_is_public`), duração do check-in, evidências fotográficas e feed de atividades.

---

## Navegação da Documentação

| Seção | Conteúdo Principal |
| :--- | :--- |
| **[1. Visão Geral do Produto](visao-produto/visao-produto.md)** | Contextualização do problema (IBGE / CETIC.br), Diagrama de Ishikawa, Declaração de Posição do Produto, análise competitiva (*Gymrats*, *YPT*, *Habitica*), objetivos e *stack* tecnológica v3.0. |
| **[2. Visão do Projeto & Processo](visao-produto/visao-projeto.md)** | Ciclo de vida ágil (Scrum + XP), papéis da equipe, fluxo de processo semanal, critérios de *Ready* e *Done* e matriz de comunicação. |
| **[3. Cronograma de Sprints & Riscos](visao-produto/cronograma-riscos.md)** | Planejamento e acompanhamento das Sprints 1 a 7 (modelo defasado Back-end $\rightarrow$ Front-end), matriz de riscos (`R-01`–`R-12`) e gatilhos de replanejamento. |
| **[4. Métricas e Medições (GQM)](visao-produto/metricas-gqm.md)** | Estrutura *Goal-Question-Metric* e especificação 5W2H para Taxa de Conclusão (`M1`), Taxa de Reprovação em Testes (`M2`) e Débito Técnico (`M3`). |
| **[Requisitos & Backlog](requisitos/requisitos.md)** | **[Perfis e Cenários](requisitos/perfis-cenarios.md)** (`P1`–`P4`), **26 Requisitos (`RF`/`RNF`)**, **12 Decisões de Produto (`D-01`–`D-12`)** e **[36 Histórias de Usuários (`US-01`–`US-36`)](requisitos/historias-usuario.md)** priorizadas via **MoSCoW**. |
| **[Arquitetura do Sistema](arquitetura/visao-geral.md)** | Estilo em 3 camadas, **[Visão de Uso e Lógica](arquitetura/visoes-uso-logica.md)**, **[Modelo Relacional PostgreSQL 17](arquitetura/modelo-dados.md)**, **[Motor Algorítmico de Metas e Estatísticas](arquitetura/motor-metas-estatisticas.md)**, **[Implantação](arquitetura/implantacao.md)** e **[ADRs](arquitetura/adrs.md)**. |
| **[Especificação da API (OpenAPI)](api/index.md)** | Contratos detalhados das rotas REST do FastAPI (`/auth`, `/habits`, `/goals`, `/check-ins`, `/user/statistics`), payloads JSON e códigos de erro padronizados. |
| **[Estratégia e Roteiro de Testes](testes/estrategia-testes.md)** | Pirâmide de testes (Pytest + Testcontainers no Back-end; Jest + RNTL + Storybook no Front-end) e casos de teste mapeados às suítes do repositório. |
| **[Governança & Rastreabilidade](governanca/rastreabilidade.md)** | Critérios de **[DoR & DoD](governanca/dod-dor.md)**, **[Matriz de Rastreabilidade Bidirecional](governanca/rastreabilidade.md)** ponta a ponta e **[Atas de Reunião](atas-reuniao/ata-reuniao-1.md)**. |

---

## Equipe & Mantenedores (UnB / FCTE)

| Matrícula | Integrante | Papel Principal no Projeto | Responsabilidades Documentais (Visão / Arquitetura) |
| :---: | :--- | :--- | :--- |
| `251027450` | **Pedro Augusto Ornelas Silva** | Scrum Master / Líder do Grupo | Problema, Declaração de Posição do Produto, Restrições Adicionais e Visão de Implantação |
| `251018961` | **Breno Gomes Cardoso** | Líder de Desenvolvimento Front-end | Objetivos do Produto, Tecnologias Utilizadas, Propósito e Escopo Arquitetural |
| `251019379` | **Caio Felipe Alcantara Nascimento** | Líder de Desenvolvimento Back-end | Visão Geral do Projeto, Introdução, Propósito e Escopo Arquitetural |
| `251027432` | **Pedro Oliveira Melo** | Desenvolvimento Back-end | Visão Estrutural, Modelo de Dados, Consolidação das Revisões v2.0/v3.0 e Referências |
| `242015862` | **José Luiz Barros Faria** | Desenvolvimento Back-end / QA | Estratégia e Roteiro de Testes de Software, Visão de Uso e Visão de Implantação |
| `251022383` | **Isaque Victor Palhares Silva** | Desenvolvimento Front-end | Declaração de Escopo do Projeto, Backlog MoSCoW e Metas Arquiteturais |
| `251022392` | **Isaque Ladeira Esteves** | Analista de Qualidade Front-end (QA) | Processo de Desenvolvimento de Software e Definições da Representação Arquitetural |
| `251023193` | **João Vítor Sauma de Faria** | Analista de Qualidade Back-end (QA) | Métricas e Medições (GQM) e Metas/Restrições Arquiteturais |

---

## Histórico Consolidado de Revisões da Documentação

| Data | Versão | Escopo da Atualização | Autores |
| :---: | :---: | :--- | :--- |
| `28/09/2026` | **v1.0** | Preenchimento preliminar dos Documentos de Visão do Produto e Projeto e de Arquitetura. | Equipe Shannon |
| `30/09/2026` | **v1.1** | Revisão do Documento de Visão: metas diárias, reclassificação do feed como *Could*, correção de alocação de sprints, inclusão das decisões de produto, papel de Dono do Produto e ajustes no roteiro de testes. | Caio Felipe, Breno Gomes, Isaque Palhares, José Luiz |
| `25/10/2026` | **v2.0** | Atualização até a Sprint 3: sessões registradas em banco (`auth_sessions`) com rotação de *refresh token*; arquitetura modular em `Router`, `Service` e `Repository`; check-in N:N com título, descrição e duração ISO 8601; exclusão definitiva de hábitos; catálogo fixo de 16 categorias; adoção de Ruff, `uv`, Biome e PostgreSQL 17; branch de integração `developer`. | Pedro Oliveira Melo |
| `09/11/2026` | **v3.0** | Atualização até a Sprint 5 e publicação no MkDocs: consolidação do módulo `goals` (tabela `goals` 1:1 com `habits`, períodos `day`, `week` e `month`, `period_end_weekday`, `starts_on` e máquina de estados `GoalProgress`); inclusão do módulo `statistics` (`GET /user/statistics` e `GET /user/statistics/habits/{id}/calendar`) e coluna `statistics_is_public` em `users`; adoção de migrações **Alembic**; atualização da arquitetura Front-end com **Expo Router**, **SWR**, **Axios** (interceptors de refresh) e sistema próprio de temas com `StyleSheet`; atualização do andamento das Sprints 3 a 5. | Pedro Oliveira Melo e Equipe Shannon |
