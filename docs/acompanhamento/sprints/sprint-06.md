# Sprint 6 — Fotos no Check-in (Cloudflare R2) e Perfil *(Em Andamento)*

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `18/11/2026` – *em andamento* (snapshot em `21/11/2026`) |
| **Objetivo** | Implementar o armazenamento seguro de **fotos nos check-ins** com **Cloudflare R2** (`US-28`, `US-29`) e as rotas de **edição de perfil, troca de senha e resumo** (`US-26`, `US-27`) no Back-end; concluir pendências da Home e iniciar o consumo de Grupos no Front-end. |
| **Branches / PRs Abertos** | [PR #160](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/160) (`CheckInPhoto`), [PR #161](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/161) (`troca-senha`), [PR #162](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/162) (`FOTO-1` Cloudflare R2) e consolidação da S5 ([PR #148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148)) |
| **Situação da Sprint** | Em andamento 🔄 |
| **Issues Planejadas (Back-end)** | 11 issues técnicas (`FOTO-1`–`FOTO-7`, `PERF-1`–`PERF-3`, `QA-1`) |
| **Andamento Parcial (BE)** | 2/11 issues fechadas (`#149`, `#152`) + 3 PRs abertos em revisão |

---

## 2. Planejamento, Replanejamento e Divisão por Frente

### Replanejamento de Escopo (Lembretes $\rightarrow$ Próxima Etapa)
Diante do volume técnico da integração de armazenamento de mídia em nuvem (Cloudflare R2 + processamento seguro de imagem + URLs assinadas + limpeza de objetos órfãos) e da necessidade de fechar a gestão de conta/perfil, a equipe decidiu priorizar **Fotos (`C7-RF-16`)** e **Perfil (`C7-RF-15`)** na Sprint 6, realocando **Lembretes (`C6-RF-14` / `US-25`)** para a etapa subsequente.

### Back-end (`apps/api`)
- **Trilha Fotos (`FOTO-1` a `FOTO-7`):** configuração de bucket **Cloudflare R2** via `boto3` (`S3Storage` + `FakeStorage` para testes), validação e processamento de imagem (versão cheia e miniatura), modelo/migração `CheckInPhoto`, endpoints `PUT` e `DELETE /check-ins/{id}/photo` (apenas para check-ins de hoje), exposição nas respostas de check-in/histórico/feed e rotina de limpeza nas exclusões e varredor de órfãos.
- **Trilha Perfil (`PERF-1` a `PERF-3`):** edição de dados da conta (`PATCH /session/me`), troca de senha (`PUT /session/me/password`) e resumo consolidado do perfil (`GET /user/profile`).
- **QA (`QA-1`):** testes de integração, segurança de upload/URLs assinadas, consultas SQL e guia final para o Front-end.

### Front-end (`apps/mobile`) *(dados factuais de Issues/PRs)*
- Fechamento das pendências da Home herdadas da Sprint 5 (`#134` testes e `#141` histórico de 28 dias) e preparação para consumir as rotas de **Grupos** da Sprint 5.

---

## 3. Issues Planejadas e Situação Atual (Snapshot `21/11/2026`)

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Situação |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **[#149](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/149)** | `C7-RNF-07` | `[FOTO-1]` Configuração do bucket (Cloudflare R2) e smoke test de armazenamento | Back-end | [#162](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/162) | Concluída ✅ |
| **[#150](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/150)** | `C7-RNF-07` | `[FOTO-2]` Camada de armazenamento: interface `Storage`, `FakeStorage` e `S3Storage` | Back-end | — | Em andamento 🔄 |
| **[#151](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/151)** | `US-28` | `[FOTO-3]` Processamento seguro da imagem: validação, versão cheia e miniatura | Back-end | — | Em andamento 🔄 |
| **[#152](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/152)** | `US-28` | `[FOTO-4]` Modelo `CheckInPhoto`, migração Alembic e consultas | Back-end | [#160](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/160) | Concluída ✅ |
| **[#153](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/153)** | `US-28`, `US-29` | `[FOTO-5]` Enviar, substituir e remover foto do check-in de hoje (`PUT`/`DELETE /check-ins/{id}/photo`) | Back-end | — | Planejada ⏳ |
| **[#154](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/154)** | `US-28`, `US-30` | `[FOTO-6]` Foto nas respostas: check-ins, histórico do hábito e feed do grupo | Back-end | — | Planejada ⏳ |
| **[#155](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/155)** | `US-29`, `C7-RNF-07` | `[FOTO-7]` Limpeza dos objetos nas exclusões e varredor de órfãos | Back-end | — | Planejada ⏳ |
| **[#156](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/156)** | `US-26` | `[PERF-1]` Editar dados da conta: nome, username e e-mail (`PATCH /session/me`) | Back-end | — | Planejada ⏳ |
| **[#157](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/157)** | `US-26` | `[PERF-2]` Trocar a senha (`PUT /session/me/password`) | Back-end | [#161](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/161) | Em revisão 🔄 |
| **[#158](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/158)** | `US-27` | `[PERF-3]` Resumo do perfil (`GET /user/profile`) | Back-end | — | Planejada ⏳ |
| **[#159](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/159)** | QA | `[QA-1]` Testes de integração, segurança das fotos, consultas e guia para o front | Back-end / QA | — | Planejada ⏳ |
| **[#134](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/134)** | QA *(S5)* | Testes das features de estatísticas na Home *(débito `DT-05`)* | Front-end / QA | — | Pendente 🟡 |
| **[#141](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/141)** | `US-15` *(S5)* | Histórico de 28 dias e check-in rápido nos cards de hábito da Home | Front-end | — | Pendente 🟡 |

---

## 4. Decisões Técnicas Já Tomadas na Sprint 6

| Decisão | Justificativa |
| :--- | :--- |
| **Cloudflare R2 via `boto3` (API S3-compatível) + abstração `Storage`** | Atende ao `C7-RNF-07` sem custo de egress (banda de saída gratuita no R2). A interface `Storage` com `FakeStorage` permite rodar toda a suíte `pytest` localmente e no CI sem depender de rede externa ([ADR-009](../../arquitetura/adrs.md#adr-009-armazenamento-de-fotos-de-check-in-em-object-storage-s3-compativel-cloudflare-r2)). |
| **Geração de versão cheia + miniatura e bloqueio de troca fora do dia** | Reduz consumo de dados móveis no feed de grupos (miniaturas) e assegura a regra de negócio da `US-29` (substituição/remoção permitida apenas para check-ins do dia atual). |
| **Priorização de Fotos + Perfil sobre Lembretes na Sprint 6** | Garante o fechamento integral do núcleo de produto no Back-end e viabiliza o consumo de fotos no feed de grupos; lembretes locais (`US-25`) foram realocados para a etapa final. |

---

## 5. Métricas GQM (Parcial — A Fechar no Encerramento da Sprint)

| Métrica | Meta | Status Atual |
| :--- | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | $\ge 90\%$ | *Em apuração* — 2/11 issues de Back-end já fechadas (`#149`, `#152`) e 3 PRs abertos (`#160`, `#161`, `#162`). |
| **M2 — Taxa de Reprovação (TRT)** | $\le 20\%$ | *Em apuração* — será consolidada ao fim dos testes da `QA-1` (`#159`) e revisão dos PRs. |
| **M3 — Débito Técnico (DTA)** | $\le 1$ | *Em acompanhamento* — foco em quitar `DT-04` (refatoração `app/group/` + `L1`/`L2`) e `DT-05` (`#134`) até o fechamento da sprint. |
