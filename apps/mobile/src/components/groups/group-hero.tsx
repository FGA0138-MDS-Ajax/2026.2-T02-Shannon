import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { HeaderAction, ProgressBar, StatTile } from "@/components/ui";
import {
  describeGroupPeriod,
  groupStatusLabels,
  rankingCriterionLabels,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
import type { GroupPeriodData } from "@/hooks/useGroupPeriod";
import { useGroupRanking } from "@/hooks/useGroupRanking";
import { GROUP_MAX_MEMBERS, type GroupDetail } from "@/services/types/groups";
import { formatDayMonth } from "@/utils/date";
import { nobodyScored } from "@/utils/group-ranking";
import MembersCircle from "./members-circle";
import RankingPodium from "./ranking-podium";

export type GroupTab = "overview" | "habits" | "ranking" | "about";

export interface GroupHeroProps {
  tab: GroupTab;
  group: GroupDetail;
  period?: GroupPeriodData;
  /** Falha ao buscar os hábitos ou o progresso: a folha mostra o erro */
  periodError?: unknown;
  colorOf: (userId: string) => string;
  userId?: string;
  selectedMemberId: string | null;
  onSelectMember: (userId: string | null) => void;
  onOpenMember: (userId: string) => void;
  /** Abre a criação de hábito (roda vazia, só admin) */
  onCreateHabit?: () => void;
  /** Altura mínima: a mesma em todas as abas, para a barra de abas não pular */
  minHeight: number;
  /** Altura de fato, para a tela guardar a maior já vista */
  onHeight: (height: number) => void;
}

/**
 * Parte escura da tela do grupo: muda com a aba escolhida. Todas as abas têm
 * a mesma altura (a da maior), com o conteúdo centralizado nela.
 */
export default function GroupHero(props: GroupHeroProps) {
  const { tab, group, minHeight, onHeight } = props;
  return (
    <View
      style={[styles.container, { minHeight }]}
      onLayout={({ nativeEvent }) => onHeight(nativeEvent.layout.height)}
    >
      <Text style={styles.summary} numberOfLines={2}>
        {[
          groupStatusLabels[group.status],
          `${group.members_count}/${GROUP_MAX_MEMBERS} integrantes`,
          describeGroupPeriod(group.status, group.ends_on),
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <View style={styles.body}>
        {tab === "overview" && <OverviewHero {...props} />}
        {tab === "habits" && (
          <HabitsHero period={props.period} error={props.periodError} />
        )}
        {tab === "ranking" && <RankingHero {...props} />}
        {tab === "about" && <AboutHero group={group} period={props.period} />}
      </View>
    </View>
  );
}

// Sem dados por falha: o erro com "Tentar novamente" fica na folha
function HeroUnavailable() {
  return (
    <HeroMessage
      title="Não foi possível carregar"
      text="Puxe para baixo ou toque em Tentar novamente."
    />
  );
}

function HeroLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.onHero} />
    </View>
  );
}

function OverviewHero({
  period,
  periodError,
  onCreateHabit,
  colorOf,
  userId,
  selectedMemberId,
  onSelectMember,
}: GroupHeroProps) {
  if (!period) return periodError ? <HeroUnavailable /> : <HeroLoading />;
  if (period.members.length === 0) {
    // A roda só conta hábitos com meta; pode haver hábitos sem nenhuma
    const hasHabits = period.habits.length > 0;
    return (
      <HeroMessage
        title="Sem metas ainda"
        text={
          hasHabits
            ? "A roda de participantes aparece quando um hábito do grupo tiver meta."
            : "A roda de participantes aparece com o primeiro hábito do grupo."
        }
        actionLabel={
          onCreateHabit && !hasHabits ? "Criar hábito do grupo" : undefined
        }
        onAction={onCreateHabit}
      />
    );
  }
  const selected = period.members.find((m) => m.user.id === selectedMemberId);
  return (
    <MembersCircle
      members={period.members}
      group={period.group}
      colorOf={colorOf}
      userId={userId}
      selectedId={selected?.user.id ?? null}
      onSelect={onSelectMember}
    />
  );
}

function HabitsHero({
  period,
  error,
}: {
  period?: GroupPeriodData;
  error?: unknown;
}) {
  if (!period) return error ? <HeroUnavailable /> : <HeroLoading />;
  const { done, total } = period.group;
  return (
    <View testID="group-together" style={styles.block}>
      <Text style={styles.title}>Metas do período atual</Text>
      <Text style={styles.bigNumber}>
        {done} <Text style={styles.bigNumberOf}>de {total}</Text>
      </Text>
      <Text style={styles.text}>metas cumpridas no grupo</Text>
      <ProgressBar
        ratio={total > 0 ? done / total : 0}
        onHero
        height={8}
        style={styles.bar}
      />
    </View>
  );
}

function RankingHero({ group, colorOf, userId, onOpenMember }: GroupHeroProps) {
  const { ranking, error } = useGroupRanking(group.id);
  if (!ranking) return error ? <HeroUnavailable /> : <HeroLoading />;
  const ended = group.status === "ended";
  return (
    <View style={styles.block}>
      <Text style={styles.title}>
        {ended
          ? `Resultado final em ${formatDayMonth(ranking.as_of)}`
          : "Ranking do grupo"}
      </Text>
      <Text style={styles.text}>
        Por {rankingCriterionLabels[ranking.criterion].toLowerCase()}
      </Text>
      {nobodyScored(ranking) ? (
        <View testID="ranking-empty" style={styles.empty}>
          <Text style={styles.zero}>0</Text>
          <Text style={styles.emptyTitle}>Ninguém pontuou ainda</Text>
          <Text style={styles.emptyText}>
            O primeiro ponto do grupo começa com um check-in.
          </Text>
        </View>
      ) : (
        <RankingPodium
          items={ranking.items}
          criterion={ranking.criterion}
          colorOf={colorOf}
          me={ranking.me}
          userId={userId}
          onOpenMember={onOpenMember}
        />
      )}
    </View>
  );
}

function AboutHero({
  group,
  period,
}: {
  group: GroupDetail;
  period?: GroupPeriodData;
}) {
  return (
    <View testID="group-about" style={styles.block}>
      <Text style={styles.description}>
        {group.description ?? "Pequenos hábitos. Conquistas compartilhadas."}
      </Text>
      <Text style={styles.text}>
        O progresso é individual. A conquista é coletiva.
      </Text>
      <View style={styles.tiles}>
        <StatTile
          onHero
          label="Pessoas no grupo"
          value={group.members_count}
          footer={`de até ${GROUP_MAX_MEMBERS}`}
        />
        <StatTile
          onHero
          label="Hábitos com meta"
          value={period ? period.habits.filter((h) => h.total > 0).length : "–"}
          footer="para fazer juntos"
        />
      </View>
    </View>
  );
}

function HeroMessage({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.message}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction && (
        <View style={styles.messageAction}>
          <HeaderAction onHero label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: 28,
  },
  body: {
    flexGrow: 1,
    justifyContent: "center",
  },
  summary: {
    marginBottom: 16,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.onHeroMuted,
  },
  loading: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  block: {
    paddingTop: 4,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 24,
    color: theme.colors.onHero,
  },
  text: {
    marginTop: 4,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.onHeroMuted,
  },
  bigNumber: {
    marginTop: 16,
    fontFamily: theme.font.bold,
    fontSize: 48,
    color: theme.colors.onHero,
  },
  bigNumberOf: {
    fontFamily: theme.font.regular,
    fontSize: 24,
    color: theme.colors.onHeroMuted,
  },
  bar: {
    marginTop: 16,
  },
  message: {
    paddingVertical: 12,
  },
  // Desconta o recuo do link para alinhar com o texto de cima
  messageAction: {
    marginTop: 8,
    marginLeft: -4,
    alignSelf: "flex-start",
  },
  empty: {
    alignItems: "flex-start",
    paddingTop: 20,
    paddingBottom: 12,
  },
  zero: {
    fontFamily: theme.font.bold,
    fontSize: 64,
    color: theme.colors.primary,
  },
  emptyTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 18,
    color: theme.colors.onHero,
  },
  emptyText: {
    maxWidth: 280,
    marginTop: 6,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.onHeroMuted,
  },
  description: {
    fontFamily: theme.font.bold,
    fontSize: 22,
    lineHeight: 30,
    color: theme.colors.onHero,
  },
  tiles: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
});
