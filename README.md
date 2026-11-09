# Habbit
Habbit é um sistema de gestão de hábitos desenvolvido para auxiliar os usuários a manterem uma rotina saudável e produtiva. O sistema é composto por um aplicativo mobile e uma API.

## Pre-requisitos
Antes de iniciar o projeto, veja o arquivo [REQUIREMENTS.md](REQUIREMENTS.md) para verificar as dependências necessárias e suas versões recomendadas.

## Estrutura do Repositório
O repositório do Habbit está organizado da seguinte forma:
```
habbit/
├── apps/
│   ├── api/          # Código da API do Habbit
│   └── mobile/       # Código do aplicativo mobile do Habbit
├── docs/             # Documentação do projeto
├── README.md         # Arquivo de documentação principal
└── REQUIREMENTS.md   # Arquivo com as dependências necessárias e suas versões recomendadas
```

## Especificações Técnicas do Repositório

Este repositório é planejado e estruturado para que seja realizado documentações de software. Caso haja outra necessidades, deve-se consultar a professora.

Atualmente se usa a ferramenta MkDocs para gerar sua documentação baseado nos seus arquivos markdowns, vocês podem achar mais instruções sobre o MkDocs através do link da documentação da ferramenta: [https://www.mkdocs.org/](https://www.mkdocs.org/).

Também é usado uma "sub-ferramenta" do MkDocs para sua estilização, o Material Theme, que pode ser consultado através do link: [https://squidfunk.github.io/mkdocs-material/](https://squidfunk.github.io/mkdocs-material/).

Este repositório também conta com uma pipeline de automatização de deploy do seu conteúdo MkDocs, para que a cada commit feito na main, a pipeline gere uma versão atualizada da sua documentação em minutos. Vale ressaltar que é importante realizar uma configuração para que tudo funcione da forma correta, as instruções são as seguintes:

* Acesse as configurações do repositório;
* Procure a aba de "Pages"
* Em "Source" escolha a opção "Deploy from a branch";
* Em "Branch" escolha "gh-pages";
* Clique em salvar e pronto;

Após essas etapas de configuração, o seu GitPages deve funcionar normalmente.
