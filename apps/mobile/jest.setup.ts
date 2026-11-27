// Configura o ambiente de React 18+ para o Jest reconhecer act() corretamente
// Necessário para renderHook + waitFor em componentes com efeitos assíncronos
global.IS_REACT_ACT_ENVIRONMENT = true;

// Margens seguras fixas: as telas com cabeçalho escuro (HeroLayout) leem os
// insets sem precisar de um SafeAreaProvider em cada teste
jest.mock("react-native-safe-area-context", () =>
  jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A barra de status é nativa; nos testes basta não quebrar
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
  setStatusBarStyle: jest.fn(),
}));
