import { theme } from "@/config/theme";

// Cores do protótipo do painel no Figma. O laranja é o `primary` do app;
// o resto só existe nesta tela por enquanto, por isso fica aqui e não no theme.
export const palette = {
  primary: theme.colors.primary,
  // Fundo de tela: o mesmo das outras abas
  background: theme.colors.gray,
  ink: "#25281F",
  inkSoft: "#707165",
  cream: "#F4F2EA",
  card: "#FCFBF6",
  cardBorder: "#D6D6C9",
  cell: "#E8E8DE",
  pill: "#E7E7DB",
  sage: "#DFE3CC",
  sageTrack: "#C3C9AF",
  headerLabel: "#C7CAB6",
  headerMuted: "#929687",
  headerRing: "#4A4D42",
  riskBackground: "#FBE4D6",
  riskText: "#B4461F",
  // Feed do grupo: fundos dos ícones, quadro da meta e fundo do modal
  sand: "#EEE7CF",
  sageSoft: "#E5E8D9",
  sageInk: "#4C5B31",
  overlay: "rgba(37, 40, 31, 0.92)",
};
