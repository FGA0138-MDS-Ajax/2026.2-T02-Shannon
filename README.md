# Documentação Oficial — HABBIT (Equipe Shannon)

Este branch (`docs`) concentra toda a documentação técnica e gerencial do projeto **HABBIT**, desenvolvido pela **Equipe Shannon** na disciplina de **Métodos de Desenvolvimento de Software (MDS — FGA0138)** da **Universidade de Brasília (UnB / FCTE)** no semestre **2026.2**.

A documentação é construída com **[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)** e publicada automaticamente no **GitHub Pages** a cada *push* na branch `docs`.

---

## Como Executar Localmente

1. Instale o MkDocs Material e o plugin de minificação:
   ```bash
   pip install mkdocs-material mkdocs-minify-plugin
   ```

2. Inicie o servidor local de pré-visualização:
   ```bash
   mkdocs serve
   ```

3. Acesse no navegador: `http://127.0.0.1:8000`

---

## Estrutura da Documentação (Versão 3.0)

- **`docs/index.md`**: Página inicial, visão executiva, pilares estratégicos, cenários do MVP, equipe e histórico de revisões (v1.0 a v3.0).
- **`docs/visao-produto/`**:
  - `visao-produto.md`: Problema (IBGE / CETIC.br), Diagrama de Ishikawa, Declaração de Posição do Produto, Objetivos e Stack Tecnológica v3.0.
  - `visao-projeto.md`: Ciclo de vida Scrum + XP, Organização da equipe, Processo de desenvolvimento (Ready/Done) e Matriz de comunicação.
  - `cronograma-riscos.md`: Planejamento e evolução das Sprints 1 a 7, Gerenciamento de riscos (`R-01` a `R-12`) e Critérios de replanejamento.
  - `metricas-gqm.md`: Medições estruturadas pelo paradigma GQM (*Goal-Question-Metric*) e detalhamento 5W2H (`M1`, `M2`, `M3`).
- **`docs/requisitos/`**:
  - `perfis-cenarios.md`: Técnicas de elicitação, priorização MoSCoW, Perfis de acesso (`P1`–`P4`) e Cenários funcionais (`C1`–`C7`).
  - `requisitos.md`: Requisitos Funcionais (`C1-RF-01`–`C7-RF-19`), Requisitos Não Funcionais (`C1-RNF-01`–`C7-RNF-07`) e Decisões de Produto (`D-01`–`D-12`).
  - `historias-usuario.md`: Matriz MoSCoW em 4 quadrantes e catálogo completo das 36 User Stories (`US-01`–`US-36`) com critérios de aceite.
- **`docs/arquitetura/`**:
  - `visao-geral.md`: Arquitetura em 3 camadas, organização modular (`Router -> Service -> Repository`), metas e restrições arquiteturais.
  - `visoes-uso-logica.md`: Diagramas de casos de uso, atividades e pacotes lógicos (`MobileClient`, `WebServer` e `Database`).
  - `modelo-dados.md`: Esquema relacional PostgreSQL 17 completo (`users`, `auth_sessions`, `habits`, `goals`, `check_ins`, `check_in_habits`, `groups`, `members`) e migrações Alembic.
  - `motor-metas-estatisticas.md`: Detalhamento algorítmico do motor de metas (`day`, `week`, `month`), máquina de estados de progresso, streaks e estatísticas/calendário.
  - `implantacao.md`: Topologia em nuvem com NGINX, ambiente local Docker Compose e pipelines de CI/CD.
  - `adrs.md`: Catálogo de Registros de Decisões de Arquitetura (*ADRs*).
- **`docs/api/index.md`**: Especificação detalhada dos endpoints da API REST em FastAPI.
- **`docs/testes/estrategia-testes.md`**: Estratégia de testes em 4 níveis e roteiro de casos de teste automatizados.
- **`docs/governanca/`**: Critérios de *Definition of Ready (DoR)* e *Definition of Done (DoD)* e Matriz de Rastreabilidade Bidirecional.
