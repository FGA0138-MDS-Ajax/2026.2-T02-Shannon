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
  // Telas do grupo: o laranja do Figma (um pouco diferente do `primary`),
  // borda clara das listas e o verde do "Você no ranking"
  orange: "#F16532",
  line: "#D4D4C6",
  sageLine: "#849362",
  podiumSilver: "#C99759",
  podiumBronze: "#BA8A52",
  podiumBase: "#32352A",
  progressTrack: "#F8B89B",
  todo: "#EAE9E0",
};
