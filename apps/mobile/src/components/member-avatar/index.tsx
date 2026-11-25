import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

export interface MemberAvatarProps {
  name: string;
  // Cor da pessoa na roda (memberColor)
  color: string;
  size: number;
  radius: number;
  // Borda do pódio; sem ela o avatar fica só com o fundo colorido
  borderColor?: string;
}

/**
 * Retrato da pessoa. A API não tem foto de usuário, então no lugar da foto do
 * Figma vai a inicial do nome na cor dela na roda.
 */
export default function MemberAvatar({
  name,
  color,
  size,
  radius,
  borderColor,
}: MemberAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
        },
        borderColor !== undefined && { borderWidth: 2, borderColor },
      ]}
    >
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.42) }]}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: {
    fontFamily: theme.font.medium,
    color: palette.ink,
  },
});
