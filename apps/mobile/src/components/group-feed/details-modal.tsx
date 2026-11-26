import { Lucide } from "@react-native-vector-icons/lucide";
import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

// Casca dos modais do grupo (check-in e hábito) e as peças que se repetem
// dentro deles, iguais nos dois frames do Figma.

export interface DetailsModalProps {
  visible: boolean;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}

// Entrada: o card sobe e aparece. Saída: desce e some, um pouco mais rápida.
const SLIDE_DISTANCE = 48;
const OPEN_DURATION = 280;
const CLOSE_DURATION = 200;

export default function DetailsModal({
  visible,
  eyebrow,
  onClose,
  children,
}: DetailsModalProps) {
  // 0 = fechado (embaixo e transparente), 1 = aberto
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  // Só avisa a tela no fim da animação: assim o conteúdo não some antes do card
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SLIDE_DISTANCE, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable
          accessibilityLabel="Fechar detalhes"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>
          {/* Título e × ficam parados; o resto rola quando o card é alto */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={close}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Lucide name="x" size={18} color={palette.ink} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
        </Animated.View>

        <Text style={styles.hint} pointerEvents="none">
          Toque fora do card para voltar
        </Text>
      </Animated.View>
    </Modal>
  );
}

/** "Caio fez check-in em" / nome do hábito / texto de apoio */
export function DetailsTitle({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <>
      <Text style={styles.overline}>{overline}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </>
  );
}

/** Quadro verde da meta: situação em cima, número embaixo */
export function DetailsGoal({
  done,
  label,
  value,
}: {
  done: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.goal}>
      <View style={styles.goalStatus}>
        <Lucide
          name={done ? "check" : "minus"}
          size={12}
          color={palette.sageInk}
        />
        <Text style={styles.goalLabel}>{label}</Text>
      </View>
      <Text style={styles.goalValue}>{value}</Text>
    </View>
  );
}

export function DetailsField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Frequência e Categoria lado a lado */
export function DetailsColumns({
  caption,
  left,
  right,
}: {
  caption?: string;
  left: { label: string; value: string };
  right: { label: string; value: string };
}) {
  return (
    <View style={styles.section}>
      {caption && <Text style={styles.caption}>{caption}</Text>}
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.label}>{left.label}</Text>
          <Text style={styles.value}>{left.value}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>{right.label}</Text>
          <Text style={styles.value}>{right.value}</Text>
        </View>
      </View>
    </View>
  );
}

export function DetailsAbout({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.about}>{text}</Text>
    </View>
  );
}

/** Botão escuro do fim do card, como o "+ Check-in" da Home */
export function DetailsAction({
  icon,
  label,
  onPress,
}: {
  icon: "plus";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Lucide name={icon} size={18} color={palette.cream} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function DetailsFooter({ text }: { text: string }) {
  return <Text style={styles.footer}>{text}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: palette.overlay,
  },
  // Nunca passa da tela: o que sobrar rola dentro do card
  card: {
    maxHeight: "80%",
    overflow: "hidden",
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.inkSoft,
    borderRadius: 26,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 21,
  },
  // No React Native o padrão é não encolher; sem o `flexShrink` o conteúdo
  // passaria do card em vez de rolar
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 21,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: theme.font.medium,
    fontSize: 10,
    color: palette.inkSoft,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  overline: {
    marginTop: 17,
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.inkSoft,
  },
  title: {
    marginTop: 6,
    fontFamily: theme.font.medium,
    fontSize: 27,
    color: palette.ink,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19.5,
    color: palette.inkSoft,
  },
  goal: {
    marginTop: 24,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 7,
    backgroundColor: palette.sageSoft,
    borderRadius: 18,
  },
  goalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goalLabel: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.sageInk,
  },
  goalValue: {
    fontFamily: theme.font.medium,
    fontSize: 22,
    color: palette.ink,
  },
  field: {
    marginTop: 24,
    gap: 7,
  },
  section: {
    marginTop: 24,
    gap: 7,
  },
  caption: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.inkSoft,
  },
  columns: {
    flexDirection: "row",
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 7,
  },
  label: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  value: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
  },
  about: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19.5,
    color: palette.ink,
  },
  action: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: palette.ink,
  },
  actionText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.cream,
  },
  footer: {
    marginTop: 40,
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.inkSoft,
  },
  hint: {
    marginTop: 22,
    alignSelf: "center",
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.cream,
  },
});
