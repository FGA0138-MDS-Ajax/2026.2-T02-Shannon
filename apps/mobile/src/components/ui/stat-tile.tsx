import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Linha de apoio embaixo do número (ex.: "3 nesta semana") */
  footer?: string;
  /** Conteúdo extra entre o número e o rodapé (ex.: barra de progresso) */
  children?: ReactNode;
  /** Valor em texto longo (ex.: "Sem dados ainda"): fonte menor */
  compact?: boolean;
  /** Sobre o cabeçalho escuro (HeroLayout) */
  onHero?: boolean;
  testID?: string;
}

// Cartão de um número de destaque, para painéis de estatísticas
export function StatTile({
  label,
  value,
  footer,
  children,
  compact = false,
  onHero = false,
  testID,
}: StatTileProps) {
  return (
    <View testID={testID} style={[styles.tile, onHero && styles.tileOnHero]}>
      <Text
        style={[styles.label, onHero && styles.mutedOnHero]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          onHero && styles.valueOnHero,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
      {children}
      {footer && (
        <Text
          style={[styles.footer, onHero && styles.mutedOnHero]}
          numberOfLines={2}
        >
          {footer}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 112,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 6,
    justifyContent: "space-between",
  },
  tileOnHero: {
    minHeight: 0,
    backgroundColor: theme.colors.heroRaised,
    borderColor: theme.colors.heroRaised,
  },
  valueOnHero: {
    color: theme.colors.onHero,
  },
  mutedOnHero: {
    color: theme.colors.onHeroMuted,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  value: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  valueCompact: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
  },
  footer: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
});
