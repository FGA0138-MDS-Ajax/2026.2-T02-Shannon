# Guia do contrato da Sprint 6 para o front

Rotas novas de **conta**, **perfil** e **foto de check-in**. Todas exigem
`Authorization: Bearer <access_token>`. Em desenvolvimento a API fica em
`http://localhost:8000` (Swagger em `/docs`).

Os exemplos de terminal são em PowerShell (`curl.exe`, e não o alias `curl`).

---

## 1. Editar a conta — `PATCH /auth/session/me`

Muda só os campos enviados (`name`, `username`, `email`). Campo omitido fica como
está; campo enviado como `null` e corpo vazio dão 422.

| Campo | Observação |
|---|---|
| `name`, `username` | Não exigem senha. As regras são as do cadastro. |
| `email` | **Exige `current_password`**, porque o e-mail é usado para entrar. |

```powershell
$h = @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod -Method Patch -Uri http://localhost:8000/auth/session/me -Headers $h `
  -ContentType "application/json" -Body '{"name":"Maria S.","username":"maria_silva"}'
```

Resposta `200`: o usuário atualizado (`id`, `name`, `username`, `email`).

| Código | Quando |
|---|---|
| 400 | `Senha atual incorreta.` (ao trocar o e-mail) |
| 409 | `Username já cadastrado.` ou `E-mail já cadastrado.` (de outra conta) |
| 422 | corpo vazio, campo `null`, e-mail sem `current_password` ou valor inválido |

Os tokens **continuam valendo**: nenhuma sessão é encerrada.

## 2. Trocar a senha — `PUT /auth/session/me/password`

```powershell
Invoke-RestMethod -Method Put -Uri http://localhost:8000/auth/session/me/password -Headers $h `
  -ContentType "application/json" -Body '{
    "current_password":"senha-atual",
    "new_password":"senha-nova-123",
    "new_password_confirmation":"senha-nova-123"
  }'
```

Resposta `200`: `{ access_token, refresh_token, exp }`.

- **Troque os dois tokens guardados** pelos novos. Todos os refresh tokens antigos
  (deste e dos outros aparelhos) passam a responder 401.
- **Senha atual errada é `400`, não `401`.** Não tente renovar o token nesse caso:
  é erro de formulário, não de sessão.
- `422`: confirmação diferente, nova senha igual à atual ou fora das regras (mínimo
  de 8 caracteres).

## 3. Perfil — `GET /user/statistics/profile`

```json
{
  "id": "…",
  "name": "Maria",
  "username": "maria_silva",
  "activity_streak": { "current": 3, "best": 7 },
  "check_ins_total": 42
}
```

Sem check-ins, os números vêm zerados. Os valores são os mesmos de
`GET /user/statistics`.

## 4. Foto do check-in

### Enviar, substituir e remover

A foto é enviada **depois** do `POST /check-ins`, em `multipart/form-data`, no campo
`photo`. Só vale para check-in feito **hoje**.

| Rota | Resposta |
|---|---|
| `PUT /check-ins/{id}/photo` | `200` com `{ thumbnail_url, url }`. Enviar de novo substitui a foto. |
| `DELETE /check-ins/{id}/photo` | `204` (também se não houver foto). |

Erros do `PUT`:

| Código | Quando |
|---|---|
| 400 | imagem inválida, truncada ou grande demais em pixels |
| 403 | check-in de outra pessoa que você consegue ver |
| 404 | check-in inexistente ou que você não vê |
| 409 | check-in que não é de hoje |
| 413 | arquivo acima de 5 MB |
| 415 | formato que não é JPEG nem PNG |
| 503 | falha ao salvar no armazenamento; tente de novo |

Exemplo em TypeScript (React Native):

```ts
async function enviarFoto(checkInId: string, uri: string, token: string) {
  const form = new FormData();
  form.append("photo", { uri, name: "foto.jpg", type: "image/jpeg" } as any);
  const response = await fetch(`${API_URL}/check-ins/${checkInId}/photo`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }, // sem Content-Type: o fetch define o boundary
    body: form,
  });
  if (!response.ok) throw new Error((await response.json()).detail);
  return response.json(); // { thumbnail_url, url }
}
```

**Antes de enviar**, reduza a imagem no app para uns 1600 px no maior lado
(`expo-image-manipulator`). O servidor limita em 5 MB e gera a versão cheia
(1280 px) e a miniatura (320 px).

### O campo `photo` nas respostas

`photo` vem por último nos check-ins e **pode ser `null`**. Ele é `null` quando não há
foto **ou** quando você não pode vê-la (os dois casos são iguais para o app).
Só veem a foto: o autor e os membros de um grupo dono de algum hábito do check-in.
Hábito pessoal público de outra pessoa mostra o check-in, mas sem foto.

| Onde | Conteúdo de `photo` |
|---|---|
| `GET /check-ins/{id}` e `PATCH /check-ins/{id}` | `thumbnail_url` **e** `url` |
| `GET /check-ins` (por dia), `GET /habits/{id}/check-ins`, feed `GET /groups/{id}/check-ins` | só `thumbnail_url`; **`url` vem `null`** |

Nas listas use `thumbnail_url`. Para ampliar, busque `GET /check-ins/{id}`.

### URLs expiram (30 minutos)

As URLs são assinadas e valem por 30 minutos.

- No `onError` da imagem, busque o dado de novo e tente **uma** vez.
- Renove ao voltar para a tela e no puxar para atualizar.
- O polling do feed (`after`) só traz itens novos: ele **não** renova as URLs dos
  itens antigos.

### Cache de imagem (`expo-image`)

- Use um `cacheKey` estável (por exemplo, o id do check-in mais a data de atualização),
  para a troca de URL não baixar a imagem de novo.
- **No logout, limpe o cache** do `expo-image` (disco e memória), sem depender do
  retorno da chamada.

### Aviso na tela de anexar

Em check-in com hábito de grupo, mostre: **"a foto ficará visível para o grupo"**.
