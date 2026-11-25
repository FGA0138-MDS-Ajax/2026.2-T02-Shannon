import { StyleSheet, Text, View } from "react-native";
import MemberAvatar from "@/components/member-avatar";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type { UserRef } from "@/services/types/groups";
import { HeroTitle, ManageLink, SheetTitle } from "./sheet-parts";

// Limite de pessoas por grupo, definido pela API
const MAX_MEMBERS = 30;

// Frase fixa do Sobre; vira o título quando o grupo não tem descrição
const TAGLINE = "Pequenos hábitos. Conquistas compartilhadas.";

export interface AboutHeroProps {
  // A frase do grupo (descrição). O nome não entra: já está no cabeçalho
  description?: string | null;
  membersCount: number;
  habitsCount: number;
}

/** Parte escura da aba Sobre: a frase do grupo e os dois números */
export function AboutHero({
  description,
  membersCount,
  habitsCount,
}: AboutHeroProps) {
  return (
    <View style={styles.hero}>
      {description ? (
        <HeroTitle title={description} subtitle={TAGLINE} />
      ) : (
        <HeroTitle title={TAGLINE} />
      )}
      <View style={styles.cards}>
        <View style={[styles.card, styles.cardPeople]}>
          <Text style={styles.cardLabel}>Pessoas no grupo</Text>
          <Text style={styles.cardNumber}>{membersCount}</Text>
          <Text style={styles.cardHint}>
            de até {MAX_MEMBERS} participantes
          </Text>
        </View>
        <View style={[styles.card, styles.cardHabits]}>
          <Text style={styles.cardLabel}>Hábitos compartilhados</Text>
          <Text style={styles.cardNumber}>{habitsCount}</Text>
          <Text style={styles.cardHint}>para crescer juntos</Text>
        </View>
      </View>
      <Text style={styles.rhythm}>Cada pessoa tem seu ritmo.</Text>
      <Text style={styles.rhythmHint}>O grupo acompanha cada passo.</Text>
    </View>
  );
}

export interface AboutSheetProps {
  members: UserRef[];
  colorOf: (userId: string) => string;
  // Abre a tela de gerenciar (convite, membros, editar, sair)
  onManage: () => void;
}

/** Parte clara da aba Sobre: o que é o grupo e quem está nele */
export function AboutSheet({ members, colorOf, onManage }: AboutSheetProps) {
  return (
    <View>
      <SheetTitle title="Sobre o grupo" />
      <Text style={styles.paragraph}>
        Um espaço para criar constância juntos. Compartilhe seus check-ins,
        acompanhe o progresso e celebre cada pequeno passo.
      </Text>

      <View style={styles.idea}>
        <Text style={styles.ideaTitle}>O progresso é individual.</Text>
        <Text style={styles.ideaText}>A conquista é coletiva.</Text>
      </View>

      <Text style={styles.peopleTitle}>Quem está nessa com você</Text>
      <View style={styles.people}>
        {members.map((member) => (
          <View key={member.id} style={styles.person}>
            <MemberAvatar
              name={member.username}
              color={colorOf(member.id)}
              size={44}
              radius={14}
            />
            <Text style={styles.personName} numberOfLines={1}>
              {member.username}
            </Text>
          </View>
        ))}
      </View>

      <ManageLink label="Gerenciar grupo" onPress={onManage} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 30,
  },
  cards: {
    marginTop: 40,
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    minHeight: 123,
    padding: 16,
    borderRadius: 22,
  },
  cardPeople: {
    backgroundColor: palette.orange,
  },
  cardHabits: {
    backgroundColor: palette.sageSoft,
  },
  cardLabel: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
  cardNumber: {
    marginTop: 6,
    fontFamily: theme.font.regular,
    fontSize: 42,
    color: palette.ink,
  },
  cardHint: {
    marginTop: 4,
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.ink,
  },
  rhythm: {
    marginTop: 38,
    fontFamily: theme.font.medium,
    fontSize: 17,
    color: palette.cream,
  },
  rhythmHint: {
    marginTop: 8,
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.headerLabel,
  },
  paragraph: {
    marginTop: 16,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19.5,
    color: palette.inkSoft,
  },
  idea: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: palette.pill,
    borderRadius: 18,
  },
  ideaTitle: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.ink,
  },
  ideaText: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.inkSoft,
  },
  peopleTitle: {
    marginTop: 26,
    fontFamily: theme.font.medium,
    fontSize: 16,
    color: palette.ink,
  },
  // 4 por linha, como no Figma; com mais pessoas, quebra em novas linhas
  people: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
  },
  person: {
    width: "25%",
    alignItems: "center",
    gap: 9,
  },
  personName: {
    maxWidth: "90%",
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
});
