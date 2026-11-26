// Cores usadas em mais de um papel (ex.: texto escuro e fundo do cabeçalho)
const primary = "#F5652F";
const ink = "#1C1917";
const paper = "#f4f2f0";
const stone = "#A8A29E";

export const theme = {
  colors: {
    // Fundos
    gray: "#f1eeec",
    gray100: paper,
    gray200: "#e5e2e0",
    gray300: "#CFCCCA",
    surface: "#FFFFFF",

    // Marca
    primary,
    primaryDark: "#D15528",
    primarySoft: "#FDE7DD",

    // Texto
    text: ink,
    textSecondary: "#57534E",
    label: "#3D3835",
    muted: "#6B6560",
    subtle: stone,
    placeholder: "#8C8885",

    // Bordas
    border: "#E7E2DE",
    inputBorder: "#D8D2CD",

    // Estados
    success: "#2F7D4F",
    successSoft: "#E3F1E8",
    warning: "#C2410C",
    warningSoft: "#FFEDD5",
    danger: "#B91C1C",
    dangerStrong: "#DC2626",
    dangerSoft: "#FEE2E2",
    dangerBorder: "#FCA5A5",

    // Cabeçalho escuro (Home e grupo), com a folha clara por cima
    hero: ink,
    heroRaised: "#2E2A27",
    heroBorder: "#4A4440",
    onHero: paper,
    onHeroMuted: stone,

    // Fundo escurecido atrás de folhas e modais
    overlay: "rgba(28, 25, 23, 0.5)",
  },
  /**
   * Uma cor por integrante do grupo, pela ordem de entrada. A roda, o ranking
   * e a lista de integrantes usam a mesma cor para a mesma pessoa. Todas são
   * escuras o bastante para a inicial branca do avatar.
   */
  memberColors: [
    primary,
    "#B07D2C",
    "#5E7F4A",
    "#7D6697",
    "#3F7F7A",
    "#5A6F9C",
    "#B4553E",
    "#8C7A22",
    "#6E8536",
    "#C25A1E",
  ],
  font: {
    regular: "LibreBaskerville_400Regular",
    medium: "LibreBaskerville_500Medium",
    semiBold: "LibreBaskerville_600SemiBold",
    bold: "LibreBaskerville_700Bold",
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  spacing: {
    screen: 24,
  },
};
