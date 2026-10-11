# 📱 Habbit Mobile

Aplicativo móvel do ecossistema **Habbit**, um sistema de gestão de hábitos desenvolvido para auxiliar os usuários a manterem uma rotina saudável e produtiva. O app é construído com **React Native** e **Expo**, utilizando roteamento baseado em arquivos com **Expo Router** e catálogo de componentes com **Storybook**.

---

## 🛠️ Tecnologias e Ferramentas

- **Framework:** [React Native](https://reactnative.dev/) (0.86) & [Expo](https://expo.dev/) (SDK 57)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **UI & Navegação:** [Expo Router](https://docs.expo.dev/router/introduction/) (Typed Routes)
- **Componentes & Animações:** React Native Reanimated, Gesture Handler, Expo UI
- **Design System & Catálogo:** [Storybook React Native](https://storybook.js.org/tutorials/intro-to-storybook/react-native/en/get-started/) (On-Device)
- **Testes:** [Jest](https://jestjs.io/) (`jest-expo`) & [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- **Gerenciador de Pacotes:** [pnpm](https://pnpm.io/) (versão 12.4.0)

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em seu ambiente:

- **Node.js 22+**
- **pnpm** (versão recomendada: `12.4.0`)
- **Dispositivo móvel ou Emulador:**
  - **Dispositivo físico:** Aplicativo [Expo Go](https://expo.dev/go) instalado (disponível na Google Play Store e Apple App Store).
  - **Emulador/Simulador:** Android Studio configurado (Android) ou Xcode (macOS/iOS).

Para conferir todas as versões recomendadas do ecossistema, consulte o arquivo [REQUIREMENTS.md](../../REQUIREMENTS.md) na raiz do repositório.

---

## 📦 Instalação das Dependências

A partir do diretório raiz do monorepo ou dentro de `apps/mobile`:

```bash
# Na pasta apps/mobile:
pnpm install
```

---

## 🏃 Executando o Aplicativo

No diretório `apps/mobile`, utilize os comandos abaixo:

### Iniciar o Bundler (Metro)

```bash
pnpm start
```

Após iniciar, escaneie o QR Code exibido no terminal utilizando o aplicativo **Expo Go** (no Android) ou a câmera padrão (no iOS).

### Iniciar em Plataformas Específicas

```bash
# Emulador / Dispositivo Android conectado
pnpm android

# Simulador iOS (somente macOS)
pnpm ios

# Navegador Web
pnpm web
```

---

## 📚 Storybook (Catálogo de Componentes)

O projeto integra o **Storybook On-Device** para visualização e desenvolvimento isolado de componentes visuais:

```bash
# Inicia o app renderizando a interface do Storybook
pnpm storybook

# Atualizar lista de histórias (caso adicione novos arquivos *.stories.tsx)
pnpm storybook:generate
```

---

## 🧪 Testes

A suíte de testes unitários e de integração de componentes utiliza o Jest com o preset `jest-expo`:

```bash
# Executa todos os testes
pnpm test

# Executa testes em modo watch
pnpm test --watch
```

---

## 🧹 Qualidade de Código e Tipagem

Para validar conformidade de estilos e tipagem:

```bash
# Verificação de lint com regras do Expo
pnpm lint

# Verificação estática de tipos com TypeScript
npx tsc --noEmit
```

> [!TIP]
> A raiz do monorepo também disponibiliza verificações globais via [Biome](https://biomejs.dev/):
> ```bash
> # Na raiz do projeto:
> pnpm run check
> ```

---

## 📂 Estrutura de Diretórios

```
apps/mobile/
├── assets/             # Imagens, splash screen e ícones da aplicação
├── src/
│   ├── app/            # Rotas e telas da aplicação (Expo Router)
│   │   ├── _layout.tsx # Layout raiz e alternador de entrada (App / Storybook)
│   │   ├── index.tsx   # Tela inicial da aplicação
│   │   └── index.stories.tsx # História do Storybook para a tela inicial
│   └── __tests__/      # Testes automatizados com React Native Testing Library
├── .storybook/         # Configuração do Storybook on-device
├── app.json            # Configurações do app Expo (ícones, schemes, plugins)
├── metro.config.js     # Configuração do empacotador Metro
├── package.json        # Dependências e scripts do projeto mobile
└── tsconfig.json       # Configuração de TypeScript e path aliases (@/*)
```

---

## 💡 Dicas e Convenções

- **Adição de dependências:** Sempre dê preferência ao comando `npx expo install <pacote>` para garantir que a versão instalada seja compatível com a versão do Expo SDK em uso.
- **Estrutura de rotas:** Mantenha apenas arquivos de rotas/telas em `src/app/`. Componentes reutilizáveis, hooks e utilitários devem residir em pastas dedicadas fora da árvore de rotas.
