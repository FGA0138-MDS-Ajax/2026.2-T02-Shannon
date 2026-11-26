import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  type FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import FadeIn from "@/components/fade-in";
import {
  feedCardTone,
  GroupCheckInModal,
  GroupFeedCard,
  GroupHabitModal,
  MemberHabitCard,
  type MemberHabitDetail,
} from "@/components/group-feed";
import GroupHeader from "@/components/group-header";
import {
  AboutHero,
  AboutSheet,
  type GroupTab,
  GroupTabBar,
  HabitsHero,
  HabitsSheet,
  RankingHero,
  RankingSheet,
} from "@/components/group-tabs";
import MembersCircle from "@/components/members-circle";
import { memberColor } from "@/components/members-circle/colors";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { describeGoal } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { useGroupBoard } from "@/hooks/useGroupBoard";
import { useSession } from "@/hooks/useSession";
import { getErrorMessage } from "@/services/api-errors";
import type { FeedItem, UserRef } from "@/services/types/groups";
import {
  groupToday,
  habitsToday,
  type MemberHabitToday,
  membersToday,
  memberTodayLabel,
} from "@/utils/group-circle";
import {
  checkInHabitDetails,
  indexMemberProgress,
  latestCheckIn,
} from "@/utils/group-feed";

// Rolando até a parte clara cobrir a parte escura de cima, ela fica com 35%
// de opacidade e 92% do tamanho, sem sumir de todo
const HERO_FADE_DISTANCE = 260;
const HERO_MIN_OPACITY = 0.35;
const HERO_MIN_SCALE = 0.92;

// Uma linha da lista de baixo na Visão geral: check-in do feed ou hábito da
// pessoa escolhida. As outras abas não têm linhas: tudo fica no cabeçalho.
type Row =
  | { kind: "check-in"; item: FeedItem }
  | { kind: "habit"; habit: MemberHabitToday };

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: group,
    error,
    isLoading,
    notFound,
    mutate: refreshGroup,
  } = useGroup(id);
  const board = useGroupBoard(id);
  const { refresh: refreshBoard } = board;
  const { user } = useSession();
  const me: UserRef | undefined = user
    ? { id: user.id, username: user.username }
    : undefined;
  const listRef = useRef<FlatList<Row>>(null);

  const [tab, setTab] = useState<GroupTab>("overview");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // Quando o conteúdo de baixo trocou, para as partes novas entrarem animadas
  const [switchedAt, setSwitchedAt] = useState(() => Date.now());
  const [openCheckIn, setOpenCheckIn] = useState<FeedItem | null>(null);
  const [openHabit, setOpenHabit] = useState<MemberHabitDetail | null>(null);

  const selectMember = useCallback((userId: string | null) => {
    setSelectedMemberId(userId);
    setSwitchedAt(Date.now());
  }, []);

  const changeTab = useCallback((next: GroupTab) => {
    setTab(next);
    setSwitchedAt(Date.now());
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Pessoa tocada no ranking: abre os hábitos dela na Visão geral
  const openMember = useCallback(
    (userId: string) => {
      changeTab("overview");
      selectMember(userId);
    },
    [changeTab, selectMember],
  );

  // Rolagem da lista, lida no nativo para a parte de cima acompanhar sem atraso
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  // A parte de cima desce o mesmo tanto que a lista sobe: fica parada na tela
  // e a parte clara passa por cima. Puxando para baixo no topo, vai junto.
  const heroShift = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: "clamp",
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_FADE_DISTANCE],
    outputRange: [1, HERO_MIN_OPACITY],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [0, HERO_FADE_DISTANCE],
    outputRange: [1, HERO_MIN_SCALE],
    extrapolate: "clamp",
  });

  // Dedo na roda: a lista para de rolar já no toque, antes do arraste
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handleTouchingChange = useCallback(
    (touching: boolean) => setScrollEnabled(!touching),
    [],
  );

  // Enquanto carrega, listas vazias; a roda e o ranking mostram o carregando
  const groupHabits = useMemo(() => board.habits ?? [], [board.habits]);
  const habitStats = useMemo(() => board.habitStats ?? [], [board.habitStats]);
  const feedItems = board.feed?.items ?? [];

  // Todos os hábitos, até os encerrados: um check-in antigo pode citar um deles
  const habitsById = useMemo(
    () => new Map(groupHabits.map((habit) => [habit.id, habit])),
    [groupHabits],
  );
  const activeHabits = useMemo(
    () => groupHabits.filter((habit) => habit.status === "active"),
    [groupHabits],
  );
  const progress = useMemo(() => indexMemberProgress(habitStats), [habitStats]);
  const members = useMemo(() => membersToday(habitStats), [habitStats]);
  const totals = useMemo(() => groupToday(members), [members]);
  const habits = useMemo(() => habitsToday(habitStats), [habitStats]);
  const asOf = habitStats[0]?.as_of;

  // Todas as pessoas do grupo, mesmo sem hábito ainda (a roda só tem quem tem)
  const groupMembers = useMemo<UserRef[]>(
    () =>
      (group?.members ?? []).map((member) => ({
        id: member.user_id,
        username: member.username,
      })),
    [group?.members],
  );

  // Mesma cor da roda para a mesma pessoa no ranking e no Sobre; quem não
  // está na roda ganha as cores seguintes
  const colorOf = useMemo(() => {
    const colors = new Map(
      members.map((member, index) => [member.user.id, memberColor(index)]),
    );
    for (const member of groupMembers) {
      if (!colors.has(member.id)) {
        colors.set(member.id, memberColor(colors.size));
      }
    }
    return (userId: string) => colors.get(userId) ?? memberColor(0);
  }, [members, groupMembers]);

  // "3 hábitos · Todo dia"; a frequência só aparece quando é a mesma para todos
  const habitsSummary = useMemo(() => {
    const count =
      activeHabits.length === 1 ? "1 hábito" : `${activeHabits.length} hábitos`;
    const goals = new Set(
      activeHabits.map((habit) => describeGoal(habit.goal)),
    );
    return goals.size === 1 ? `${count} · ${[...goals][0]}` : count;
  }, [activeHabits]);

  const selectedMember = members.find(
    (member) => member.user.id === selectedMemberId,
  );

  const rows: Row[] =
    tab !== "overview"
      ? []
      : selectedMember
        ? // Feitos primeiro, como no Figma
          [...selectedMember.habits]
            .sort((a, b) => Number(b.done) - Number(a.done))
            .map((habit) => ({ kind: "habit", habit }))
        : feedItems.map((item) => ({ kind: "check-in", item }));

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
      refreshBoard();
      // Cabeçalho escuro: relógio e bateria claros só enquanto a tela está na frente
      StatusBar.setStyle("light");
      return () => StatusBar.setStyle("auto");
    }, [refreshGroup, refreshBoard]),
  );

  const openMemberHabit = (habit: MemberHabitToday) => {
    if (!selectedMember || !asOf) return;
    if (habit.done) {
      const checkIn = latestCheckIn(
        feedItems,
        selectedMember.user.id,
        habit.habitId,
      );
      if (checkIn) {
        setOpenCheckIn(checkIn);
        return;
      }
    }
    const groupHabit = habitsById.get(habit.habitId);
    if (!groupHabit) return;
    setOpenHabit({
      member: selectedMember.user,
      habit: groupHabit,
      progress: habit.progress,
      day: asOf,
    });
  };

  // O fundo claro fica fora da animação: só o card aparece aos poucos
  const renderRow = ({ item: row, index }: { item: Row; index: number }) => (
    <View style={styles.row}>
      <FadeIn since={switchedAt} index={index}>
        {row.kind === "check-in" ? (
          <GroupFeedCard
            item={row.item}
            category={habitsById.get(row.item.habits[0]?.id)?.category}
            tone={feedCardTone(index)}
            onPress={() => setOpenCheckIn(row.item)}
          />
        ) : (
          <MemberHabitCard
            name={row.habit.name}
            description={habitsById.get(row.habit.habitId)?.description ?? null}
            done={row.habit.done}
            onPress={() => openMemberHabit(row.habit)}
          />
        )}
      </FadeIn>
    </View>
  );

  // Parte escura de cima de cada aba
  const renderHero = (): ReactNode => {
    if (!group) return null;
    switch (tab) {
      case "ranking":
        return board.ranking ? (
          <RankingHero
            ranking={board.ranking}
            ended={group.status === "ended"}
            colorOf={colorOf}
          />
        ) : (
          <HeroLoading />
        );
      case "about":
        return (
          <AboutHero
            description={group.description}
            membersCount={group.members_count}
            habitsCount={activeHabits.length}
          />
        );
      case "habits":
        return board.habitStats ? (
          <HabitsHero group={totals} />
        ) : (
          <HeroLoading />
        );
      default:
        return !board.habitStats ? (
          <HeroLoading />
        ) : (
          <MembersCircle
            members={members}
            group={totals}
            selectedId={selectedMemberId}
            onSelect={selectMember}
            onTouchingChange={handleTouchingChange}
          />
        );
    }
  };

  // Parte clara de cada aba, logo abaixo da barra de abas
  const renderSheet = (): ReactNode => {
    switch (tab) {
      case "ranking":
        return board.ranking && board.stats && me ? (
          <RankingSheet
            ranking={board.ranking}
            stats={board.stats}
            me={me}
            colorOf={colorOf}
            onOpenMember={openMember}
          />
        ) : null;
      case "about":
        return (
          <AboutSheet
            members={groupMembers}
            colorOf={colorOf}
            onManage={() => router.push(`/groups/${id}/about` as Href)}
          />
        );
      case "habits":
        return (
          <HabitsSheet
            habits={habits}
            summary={habitsSummary}
            descriptionOf={(habitId) =>
              habitsById.get(habitId)?.description ?? null
            }
            onManage={() => router.push(`/groups/${id}/habits` as Href)}
          />
        );
      default:
        return selectedMember ? (
          <View style={styles.memberHeader}>
            <View style={styles.titles}>
              <Text style={styles.title}>
                Hábitos de {selectedMember.user.username}
              </Text>
              <Text style={styles.subtitle}>
                {memberTodayLabel(selectedMember)}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              onPress={() => selectMember(null)}
              style={styles.seeAll}
            >
              <Text style={styles.seeAllText}>Ver todos</Text>
            </PressableScale>
          </View>
        ) : (
          <View>
            <View style={styles.titles}>
              <Text style={styles.title}>Check-ins recentes</Text>
              <Text style={styles.subtitle}>
                O grupo em movimento, em tempo real.
              </Text>
            </View>
            {board.feed && feedItems.length === 0 && (
              <Text style={styles.emptyFeed}>
                Ninguém fez check-in ainda. O primeiro pode ser o seu.
              </Text>
            )}
          </View>
        );
    }
  };

  const renderState = () => {
    if (isLoading && !group) {
      return (
        <ActivityIndicator
          testID="group-loading"
          size="large"
          color={theme.colors.primary}
        />
      );
    }

    if (notFound) {
      return (
        <>
          <Text style={styles.message}>
            Este grupo não existe mais ou você não participa dele.
          </Text>
          <Button variant="secondary" onPress={() => router.back()}>
            Voltar para os grupos
          </Button>
        </>
      );
    }

    return (
      <>
        <Text style={styles.message}>{getErrorMessage(error)}</Text>
        <Button variant="secondary" onPress={() => refreshGroup()}>
          Tentar novamente
        </Button>
      </>
    );
  };

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <GroupHeader name={group?.name} />

      {!group ? (
        <View style={[styles.sheet, styles.centered]}>{renderState()}</View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={rows}
          scrollEnabled={scrollEnabled}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // A chave muda com a pessoa escolhida: os itens remontam e animam
          keyExtractor={(row) =>
            row.kind === "check-in"
              ? `check-in-${row.item.id}`
              : `${selectedMemberId}-${row.habit.habitId}`
          }
          renderItem={renderRow}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <>
              <Animated.View
                style={{
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }, { scale: heroScale }],
                }}
              >
                {/* A `key` troca o conteúdo com esmaecido a cada aba */}
                <FadeIn key={tab} since={switchedAt}>
                  {renderHero()}
                </FadeIn>
              </Animated.View>
              <View style={styles.sheetTop}>
                <GroupTabBar value={tab} onChange={changeTab} />
                <FadeIn
                  key={`${tab}-${selectedMemberId ?? "all"}`}
                  since={switchedAt}
                  style={styles.sheetContent}
                >
                  {renderSheet()}
                </FadeIn>
              </View>
            </>
          }
          ListFooterComponent={<View style={styles.footerSpace} />}
          // A parte clara vai até o fim da tela mesmo com pouco conteúdo
          contentContainerStyle={styles.listContent}
          ListFooterComponentStyle={styles.footer}
        />
      )}

      <GroupCheckInModal
        item={openCheckIn}
        details={
          openCheckIn
            ? checkInHabitDetails(openCheckIn, habitsById, progress)
            : []
        }
        groupName={group?.name}
        onClose={() => setOpenCheckIn(null)}
      />
      <GroupHabitModal
        detail={openHabit}
        groupName={group?.name}
        onClose={() => setOpenHabit(null)}
        onCheckIn={
          openHabit && openHabit.member.id === me?.id
            ? () => {
                const { habit } = openHabit;
                setOpenHabit(null);
                router.push({
                  pathname: "/check-ins/create",
                  params: { habitId: habit.id, category: habit.category },
                } as Href);
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

// Parte escura enquanto os dados da aba chegam
function HeroLoading() {
  return (
    <View style={styles.heroLoading}>
      <ActivityIndicator color={palette.cream} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  // Parte clara enquanto o grupo carrega ou dá erro
  sheet: {
    flex: 1,
    backgroundColor: palette.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSoft,
    textAlign: "center",
  },
  listContent: {
    flexGrow: 1,
  },
  // Cada pedaço da parte clara tem fundo próprio; atrás deles fica a parte
  // escura de cima
  sheetTop: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 22,
    backgroundColor: palette.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    marginTop: 26,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titles: {
    flexShrink: 1,
    gap: 5,
  },
  title: {
    fontFamily: theme.font.medium,
    fontSize: 20,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  seeAll: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: palette.pill,
  },
  seeAllText: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
  row: {
    paddingHorizontal: 22,
    backgroundColor: palette.cream,
  },
  separator: {
    height: 10,
    backgroundColor: palette.cream,
  },
  footer: {
    flexGrow: 1,
    backgroundColor: palette.cream,
  },
  footerSpace: {
    height: 32,
  },
  heroLoading: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFeed: {
    marginTop: 18,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19.5,
    color: palette.inkSoft,
  },
});
