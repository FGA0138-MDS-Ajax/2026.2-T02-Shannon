# Dependências
Abaixo estão listadas as dependências necessárias para o projeto, juntamente com suas versões recomendadas:

| Ferramenta     | Versão |
| -------------- | ------ |
| Docker         | ^29    |
| Docker Compose | ^5     |
| Node           | ^22    |
| pnpm           | 12.4.0 |
| Python         | 3.13   |
| uv             | ^0.7   |

## Ambiente de cada aplicação
### API
A API do Habbit é desenvolvida em Python e utiliza o framework FastAPI. Para gerenciar as dependências do projeto, é utilizado o uv. A API também utiliza o PostgreSQL como banco de dados.

Vá ao diretório `apps/api` para encontrar o arquivo `.env.example`, que contém as variáveis de ambiente necessárias para a configuração da API. Copie o conteúdo deste arquivo para um novo arquivo chamado `.env` na raiz do diretório `apps/api` e ajuste as variáveis conforme necessário.

Você pode instalar as dependências do projeto utilizando o seguinte comando:
```bash
uv sync
```

Mais detalhes em [apps/api/README.md](apps/api/README.md).

### Mobile
O aplicativo mobile do Habbit é desenvolvido em React Native com Expo. Para instalar as dependências do projeto, execute o seguinte comando no diretório `apps/mobile`:
```bash
pnpm install
```

Mais detalhes em [apps/mobile/README.md](apps/mobile/README.md).


### Erro de caminho no interpretador do UV

Roda esse comando:

```bash
uv run python -c "import sys; print(sys.executable)"
```

Pega o caminho, abre o Select Interprector do VSCode com Ctrl + Shift + P, selecione a opção de colocar o caminho e cola o caminho copiado. 
