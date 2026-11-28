# Sprint 6 — Fotos no Check-in (Cloudflare R2) e Perfil *(Em Andamento)*

## 1. Identificação

| Informação | Descrição |
| :--- | :--- |
| **Período** | `18/11/2026` – *em andamento* (atualizado em `28/11/2026`) |
| **Objetivo** | Implementar o armazenamento seguro de **fotos nos check-ins** com **Cloudflare R2** (`US-28`, `US-29`) e as rotas de **edição de perfil, troca de senha e resumo** (`US-26`, `US-27`) no Back-end; concluir pendências da Home e consumir Grupos no Front-end. |
| **Branches / PRs Principais** | Back-end: `feature/foto-1-fundacao` $\rightarrow$ `developer` ([PR #191](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/191), com as sub-branches [#160](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/160), [#164](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/164), [#166](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/166)–[#171](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/171) e [#185](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/185)); consolidação da S5 ([PR #148](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/148))<br>Front-end: Grupos e Home ([PR #190](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/190) e [#197](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/197)); fotos no app em revisão ([PR #219](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/219)) |
| **Situação da Sprint** | Em andamento 🔄 |
| **Issues Planejadas (Back-end)** | 11 issues técnicas (`FOTO-1`–`FOTO-7`, `PERF-1`–`PERF-3`, `QA-1`) |
| **Andamento (BE)** | **11/11 issues fechadas** e integradas à `developer` pelo PR `#191` |

---

## 2. Planejamento, Replanejamento e Divisão por Frente

### Replanejamento de Escopo (Lembretes $\rightarrow$ Próxima Etapa)
Diante do volume técnico da integração de armazenamento de mídia em nuvem (Cloudflare R2 + processamento seguro de imagem + URLs assinadas + limpeza de objetos órfãos) e da necessidade de fechar a gestão de conta/perfil, a equipe decidiu priorizar **Fotos (`C7-RF-16`)** e **Perfil (`C7-RF-15`)** na Sprint 6, realocando **Lembretes (`C6-RF-14` / `US-25`)** para a etapa subsequente.

### Back-end (`apps/api`) — concluído
- **Trilha Fotos (`FOTO-1` a `FOTO-7`):** bucket **Cloudflare R2** via `boto3` (`S3Storage` + `FakeStorage` para testes e backend em memória para uso local), processamento da imagem com **Pillow** (validação por conteúdo, regravação em JPEG sem metadados, versão cheia e miniatura), modelo e migração `CheckInPhoto` (`fe2371e1b181`), rotas `PUT` e `DELETE /check-ins/{id}/photo` (apenas check-ins de hoje), campo `photo` nas respostas de check-in, histórico do hábito e feed do grupo, limpeza nas exclusões e varredor de órfãos (`python -m app.photos.sweep`).
- **Trilha Perfil (`PERF-1` a `PERF-3`):** edição da conta (`PATCH /auth/session/me`), troca de senha (`PUT /auth/session/me/password`, que encerra todas as sessões) e resumo do perfil (`GET /user/statistics/profile`).
- **QA (`QA-1`):** testes de integração, de segurança das fotos e de número de consultas. A entrega foi integrada na `main` pelo [PR #172](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/172), revertida pelo [PR #173](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/173) e reaplicada na `developer` (commit `9e7f348`).
- Detalhamento das regras em [Fotos de Check-in e Perfil](../../arquitetura/fotos-perfil.md).

### Front-end (`apps/mobile`)
- **Pendências herdadas da Sprint 5, concluídas:** testes das estatísticas da Home (**[#134](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/134)**) e histórico de 28 dias com check-in rápido nos cards (**[#141](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/141)**), ambas fechadas em `24/11`.
- **Grupos no mobile, concluídos:** camada de dados (**[#174](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/174)**), lista, criação e entrada por código (**[#175](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/175)**), visão geral, membros e convite (**[#176](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/176)**), hábitos do grupo (**[#177](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/177)**), hábito de grupo no detalhe do hábito e do check-in (**[#178](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/178)**), feed (**[#179](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/179)**), ranking e estatísticas (**[#180](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/180)**) e hábito de grupo na lista e no check-in (**[#181](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/181)**). Os testes de grupos (**[#182](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/182)**) seguem abertos.
- **Perfil e fotos no app, em andamento:** fotos dos check-ins ([#210](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/210), PR [#219](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/219)), perfil e conta ([#211](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/211)) e testes ([#212](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/212)).

---

## 3. Issues Planejadas e Situação Atual (`28/11/2026`)

| Issue | Requisito / US | Entrega Planejada | Frente | PR(s) | Situação |
| :---: | :---: | :--- | :---: | :---: | :---: |
| **[#149](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/149)** | `C7-RNF-07` | `[FOTO-1]` Configuração do bucket (Cloudflare R2) e smoke test de armazenamento | Back-end | [#191](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/191) | Concluída ✅ |
| **[#150](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/150)** | `C7-RNF-07` | `[FOTO-2]` Camada de armazenamento: interface `Storage`, `FakeStorage` e `S3Storage` | Back-end | [#166](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/166) | Concluída ✅ |
| **[#151](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/151)** | `US-28` | `[FOTO-3]` Processamento seguro da imagem: validação, versão cheia e miniatura | Back-end | [#164](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/164) | Concluída ✅ |
| **[#152](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/152)** | `US-28` | `[FOTO-4]` Modelo `CheckInPhoto`, migração Alembic e consultas | Back-end | [#160](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/160) | Concluída ✅ |
| **[#153](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/153)** | `US-28`, `US-29` | `[FOTO-5]` Enviar, substituir e remover foto do check-in de hoje (`PUT`/`DELETE /check-ins/{id}/photo`) | Back-end | [#167](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/167) | Concluída ✅ |
| **[#154](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/154)** | `US-28`, `US-30` | `[FOTO-6]` Foto nas respostas: check-ins, histórico do hábito e feed do grupo | Back-end | [#168](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/168) | Concluída ✅ |
| **[#155](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/155)** | `US-29`, `C7-RNF-07` | `[FOTO-7]` Limpeza dos objetos nas exclusões e varredor de órfãos | Back-end | [#169](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/169) | Concluída ✅ |
| **[#156](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/156)** | `US-26` | `[PERF-1]` Editar dados da conta: nome, username e e-mail (`PATCH /auth/session/me`) | Back-end | [#170](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/170) | Concluída ✅ |
| **[#157](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/157)** | `US-26` | `[PERF-2]` Trocar a senha (`PUT /auth/session/me/password`) | Back-end | [#161](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/161) | Concluída ✅ |
| **[#158](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/158)** | `US-27` | `[PERF-3]` Resumo do perfil (`GET /user/statistics/profile`) | Back-end | [#171](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/171) | Concluída ✅ |
| **[#159](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/159)** | QA | `[QA-1]` Testes de integração, segurança das fotos, consultas e guia para o front | Back-end / QA | [#185](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/185) | Concluída ✅ |
| **[#134](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/134)** | QA *(S5)* | Testes das features de estatísticas na Home *(débito `DT-05`)* | Front-end / QA | — | Concluída ✅ *(24/11)* |
| **[#141](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/issues/141)** | `US-15` *(S5)* | Histórico de 28 dias e check-in rápido nos cards de hábito da Home | Front-end | [#190](https://github.com/FGA0138-MDS-Ajax/2026.2-T02-Shannon/pull/190) | Concluída ✅ *(24/11)* |

*Nota:* as rotas de perfil e de resumo diferem das previstas nas issues (`/session/me`, `/session/me/password` e `/user/profile`): foram implementadas sob `/auth/session/me`, `/auth/session/me/password` e `/user/statistics/profile`.

---

## 4. Decisões Técnicas Tomadas na Sprint 6

| Decisão | Justificativa |
| :--- | :--- |
| **Cloudflare R2 via `boto3` (API S3-compatível) + abstração `Storage`** | Atende ao `C7-RNF-07` sem custo de egress. A interface `Storage` com `FakeStorage` permite rodar toda a suíte `pytest` localmente e no CI sem depender de rede externa ([ADR-009](../../arquitetura/adrs.md#adr-009-armazenamento-de-fotos-de-check-in-em-object-storage-s3-compativel-cloudflare-r2)). |
| **Foto em chamada separada, regravada em JPEG sem metadados, com versão cheia e miniatura** | O check-in não depende do upload, não expõe EXIF e reduz o consumo de dados móveis no feed; a troca é permitida apenas para check-ins do dia (`US-29`) ([ADR-013](../../arquitetura/adrs.md#adr-013-foto-do-check-in-em-chamada-separada-regravada-em-jpeg-sem-metadados)). |
| **Limite de upload de 4 MB (previsto: 5 MB)** | A Vercel recusa corpos acima de 4,5 MB antes de a requisição chegar à API; com 4 MB, o limite da API vale primeiro e devolve mensagem própria (commit `0a54de4`). |
| **Troca de senha encerra todas as sessões** | O *access token* não identifica o aparelho; apagar todas as sessões e abrir uma nova na mesma transação evita sessões antigas vivas ([ADR-014](../../arquitetura/adrs.md#adr-014-troca-de-senha-encerra-todas-as-sessoes-do-usuario)). |
| **Priorização de Fotos + Perfil sobre Lembretes** | Garante o fechamento do núcleo de produto no Back-end e viabiliza o consumo de fotos no feed de grupos; lembretes locais (`US-25`) foram realocados para a etapa final. |

---

## 5. Métricas GQM (Parcial — A Fechar no Encerramento da Sprint)

| Métrica | Meta | Status Atual |
| :--- | :---: | :--- |
| **M1 — Taxa de Conclusão (TCS)** | $\ge 90\%$ | *Em apuração* — 11/11 issues de Back-end fechadas (`#149`–`#159`) e as pendências herdadas `#134` e `#141` concluídas. |
| **M2 — Taxa de Reprovação (TRT)** | $\le 20\%$ | *Em apuração* — será consolidada no encerramento da sprint. |
| **M3 — Débito Técnico (DTA)** | $\le 1$ | *Em acompanhamento* — `DT-05` quitado (`#134`); `DT-04` (refatoração `app/group/` + `L1`/`L2`) segue em aberto. |
