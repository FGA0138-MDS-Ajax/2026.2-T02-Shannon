// Configura o ambiente de React 18+ para o Jest reconhecer act() corretamente
// Necessário para renderHook + waitFor em componentes com efeitos assíncronos
global.IS_REACT_ACT_ENVIRONMENT = true;
