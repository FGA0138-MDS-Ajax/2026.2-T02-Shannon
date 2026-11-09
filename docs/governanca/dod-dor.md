# Definition of Ready (DoR) & Definition of Done (DoD)

Este documento estabelece os critérios formais de qualidade e completude que governam a transição de qualquer funcionalidade ou correção no fluxo de trabalho da **Equipe Shannon** ([Seção 2.3 — Processo de Desenvolvimento](../visao-produto/visao-projeto.md#23-processo-de-desenvolvimento-de-software)).

---

## 1. Definição de Preparado — *Definition of Ready for Test (Ready)*

Uma tarefa ou *User Story* sai da coluna **Em Desenvolvimento** para o estado **Ready** (pronta para verificação de QA e revisão de código) somente quando cumpre **todos** os critérios abaixo:

- [x] **Implementação Completa:** O código atende integralmente aos Critérios de Aceite descritos na *User Story* e às Decisões de Produto (`D-01` a `D-12`).
- [x] **Arquitetura Respeitada:**
  - No Back-end (`apps/api`), a separação entre `router.py`, `service.py`, `repository.py`, `schemas.py`, `models.py`, `exceptions.py` e `responses.py` foi mantida sem regras de negócio no repositório e sem *commits* fora do *service*;
  - No Front-end (`apps/mobile`), a comunicação HTTP utiliza a camada `src/services/` e os componentes seguem os tokens de `src/config/theme.ts`.
- [x] **Testes Unitários e de Integração Escritos:** O desenvolvedor implementou os testes correspondentes (Pytest / Testcontainers no Back-end; Jest / RNTL no Front-end) e todos executam com sucesso localmente.
- [x] **Linter e Formatação Limpos:**
  - Back-end: `uv run ruff check .` e `uv run ruff format --check .` sem avisos ou erros;
  - Front-end: `pnpm biome check` / `pnpm --filter mobile lint` sem erros.
- [x] **Pull Request Aberto:** O PR foi aberto tendo como base a branch `developer`, preenchendo o template padrão do repositório.

---

## 2. Definição de Pronto — *Definition of Done (Done)*

Uma funcionalidade atinge o estado **Done** (concluída e contabilizada positivamente na métrica **M1 — Taxa de Conclusão da Sprint**) somente quando cumpre **todos** os critérios abaixo:

- [x] **CI 100% Verde no GitHub Actions:** Os workflows automatizados (`lint.yaml`, `api-tests.yaml` e `mobile-tests.yaml`) executaram e passaram com sucesso (`SUCCESS`) no commit da branch do PR.
- [x] **Testes de Regressão e QA Aprovados:** Nenhum teste existente foi quebrado e os casos de borda dos critérios de aceite foram validados sem falhas (reprovações retornam o item ao desenvolvimento e incrementam a métrica **M2**).
- [x] **Migrações de Banco Validadas (quando aplicável):** Qualquer mudança em modelos SQLModel possui migração **Alembic** correspondente e passa no teste `tests/test_migrations.py`.
- [x] **Documentação OpenAPI Atualizada:** Novas rotas ou alterações de schema possuem `summary`, `description` e `responses` documentados em português no FastAPI.
- [x] **Revisão por Pares (*Peer Review*):** O *Pull Request* foi revisado e aprovado formalmente por pelo menos outro integrante da equipe e integrado à branch `developer`.

---

## 3. Política de Branches e Versionamento

| Branch | Finalidade e Regras de Proteção |
| :--- | :--- |
| **`main`** | Branch de lançamentos consolidados (*releases*). Não recebe commits diretos de funcionalidades isoladas. |
| **`developer`** | Branch principal de integração contínua do código-fonte (`apps/api` e `apps/mobile`). Todo PR de funcionalidade ou correção deve apontar para `developer`. |
| **`feature/*` / `feat/*` / `fix/*`** | Branches curtas de trabalho criadas a partir de `developer` para cada Issue/User Story (ex.: `feature/goal-1-fundacao`, `feature/statistics-1-fundacao`, `feature/52-fluxo-checkin`). |
| **`docs`** | Branch independente (órfã) dedicada exclusivamente à documentação **MkDocs Material**; todo *push* ou *merge* na `docs` aciona o workflow `.github/workflows/ci.yml` que publica o site na branch `gh-pages`. |
