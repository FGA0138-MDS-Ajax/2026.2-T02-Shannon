# Fotos de Check-in e Perfil do Usuário

Esta página consolida as regras implementadas no Back-end na **Sprint 6** para o **perfil do usuário** (`US-26`, `US-27`) e para as **fotos de check-in** (`US-28`, `US-29`). O consumo dessas rotas no aplicativo mobile está em andamento. As decisões de arquitetura correspondentes são o [ADR-009](adrs.md#adr-009-armazenamento-de-fotos-de-check-in-em-object-storage-s3-compativel-cloudflare-r2), o [ADR-013](adrs.md#adr-013-foto-do-check-in-em-chamada-separada-regravada-em-jpeg-sem-metadados) e o [ADR-014](adrs.md#adr-014-troca-de-senha-encerra-todas-as-sessoes-do-usuario).

---

## 1. Perfil e Conta

| Rota | O que faz | Regras principais |
| :--- | :--- | :--- |
| `PATCH /auth/session/me` | Edita nome, *username* e e-mail | Altera só os campos enviados; trocar o e-mail exige `current_password` (errada responde `400`); valor já usado por **outra** conta responde `409` (o valor atual da própria pessoa não é erro); a senha é conferida antes da unicidade, para não revelar quais e-mails existem. Os tokens continuam válidos. |
| `PUT /auth/session/me/password` | Troca a senha | Exige senha atual e confirmação da nova (diferente da atual, de 8 caracteres a 72 bytes); apaga **todas** as sessões do usuário e abre uma nova na mesma transação; devolve um par de tokens novo. |
| `GET /user/statistics/profile` | Resumo do perfil | `id`, `name`, `username`, `activity_streak` (`current` e `best`) e `check_ins_total`. |

A coluna `users.statistics_is_public` existe no banco (padrão `false`), mas nenhuma rota a expõe ainda.

---

## 2. Fotos de Check-in

### 2.1. Rotas

| Rota | Resposta | Observações |
| :--- | :--- | :--- |
| `PUT /check-ins/{id}/photo` | `200` com `CheckInPhotoPublic` | `multipart/form-data`, campo `photo`; envia ou substitui. |
| `DELETE /check-ins/{id}/photo` | `204` | Idempotente: responde `204` mesmo sem foto. |

Erros: `400` (imagem inválida), `403` (não é o autor), `404` (check-in inexistente), `409` (check-in que não é de hoje), `413` (acima de 4 MB), `415` (não é JPEG nem PNG), `422` (identificador inválido) e `503` (falha ao gravar no armazenamento).

### 2.2. Regras de negócio

- A foto é enviada **depois** do `POST /check-ins`, em outra chamada. Se ela falhar, o check-in continua válido.
- **Uma foto por check-in**. Só o autor altera, e apenas em check-in **de hoje** (fuso `America/Sao_Paulo`); em outro dia a API responde `409`.
- Limite de **4 MB** no corpo. O valor caiu de 5 MB porque a Vercel recusa corpos acima de 4,5 MB com um `413` próprio, antes de a requisição chegar à API; com 4 MB, o limite da API vale primeiro e devolve a mensagem `A foto deve ter no máximo 4 MB.`. O aplicativo precisa reduzir a foto antes de enviar.
- Excluir o check-in apaga também os objetos da foto.

### 2.3. Processamento da imagem

1. O formato é conferido pelo conteúdo (assinatura do arquivo): só **JPEG** e **PNG**.
2. Imagens que declaram mais de 40 milhões de pixels são recusadas antes de decodificar.
3. A imagem é regravada como **JPEG novo, sem nenhum metadado** (EXIF e comentários não são herdados); o original enviado nunca é guardado.
4. Geram-se duas versões: **cheia** (até 1280 px no maior lado) e **miniatura** (até 320 px), ambas com qualidade 82.

### 2.4. Armazenamento e acesso

- Os objetos ficam em *bucket* **privado** do **Cloudflare R2** (`boto3`); no banco fica apenas a tabela [`check_in_photos`](modelo-dados.md#27-tabela-check_in_photos-appphotosmodelspy-sprint-6) com as chaves.
- A API devolve **URLs assinadas** com validade de 30 minutos (`PHOTO_URL_EXPIRE_MINUTES`). Nas listas e no feed vem só `thumbnail_url` (`url` fica `null`); no detalhe vêm as duas.
- Visibilidade: o **autor** e os **membros atuais** de um grupo dono de algum hábito do check-in. Em um hábito pessoal público, outras pessoas veem o check-in, mas `photo` vem `null`.
- Interface `Storage` com três implementações: `S3Storage` (R2), `FakeStorage` (testes) e backend em memória para desenvolvimento local (`STORAGE_BACKEND=memory`).

### 2.5. Consistência e limpeza

- **Ordem de consistência:** sobem os objetos novos, grava-se no banco e faz-se o *commit*, e só então apagam-se os antigos. Falha ao apagar vai para o log e o varredor recolhe depois.
- **Varredor de órfãos** (`python -m app.photos.sweep`): remove objetos sob `check-ins/` que não têm mais registro em `check_in_photos` e têm mais de 24 horas. **Não é agendado**: a execução é manual. Aceita `--dry-run` para apenas listar e contar.

!!! danger "Cuidado com o varredor"
    Nunca rode o varredor apontando para o bucket de produção (`habbit-photos-prod`) com **outro banco** conectado (por exemplo, o banco local): todas as fotos válidas de produção seriam tratadas como órfãs e apagadas. Execute sempre primeiro com `--dry-run`.

### 2.6. Configuração

| Variável | Descrição |
| :--- | :--- |
| `STORAGE_BACKEND` | `memory` (padrão local) ou `r2`. Com `r2`, as quatro variáveis abaixo são obrigatórias. |
| `R2_ENDPOINT_URL` | Endpoint S3 da conta Cloudflare R2. |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Credenciais do token de API do R2 (nunca versionar). |
| `R2_BUCKET_NAME` | Nome do bucket (`habbit-photos-prod` em produção). |
| `PHOTO_URL_EXPIRE_MINUTES` | Validade das URLs assinadas (padrão `30`). |
