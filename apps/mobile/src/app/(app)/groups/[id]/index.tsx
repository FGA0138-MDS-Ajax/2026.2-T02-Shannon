import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import {
  feedCompleteDays,
  feedGroupHabits,
  feedHabitStats,
  feedPage,
} from "@/components/group-feed/__fixtures__/feed";
import GroupHeader from "@/components/group-header";
import GroupWeek from "@/components/group-week";
import MembersCircle from "@/components/members-circle";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { getErrorMessage } from "@/services/api-errors";
import type { FeedItem } from "@/services/types/groups";
import {
  groupToday,
  type MemberHabitToday,
  membersToday,
  memberTodayLabel,
} from "@/utils/group-circle";
import {
  checkInHabitDetails,
  indexMemberProgress,
  latestCheckIn,
} from "@/utils/group-feed";

// Rolando até a parte clara cobrir a roda, ela fica com 35% de opacidade
// e 92% do tamanho, sem sumir de todo
const WHEEL_FADE_DISTANCE = 260;
const WHEEL_MIN_OPACITY = 0.35;
const WHEEL_MIN_SCALE = 0.92;

// Uma linha da lista de baixo: check-in do feed ou hábito da pessoa escolhida
type Row =
  | { kind: "check-in"; item: FeedItem }
  | { kind: "habit"; habit: MemberHabitToday };

// O círculo e o feed ainda usam dados falsos (__fixtures__). A troca pela
// API, a paginação e as novidades automáticas são os próximos passos da #179.
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: group,
    error,
    isLoading,
    notFound,
    mutate: refreshGroup,
  } = useGroup(id);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // Quando a lista de baixo trocou, para os itens novos entrarem animados
  const [switchedAt, setSwitchedAt] = useState(() => Date.now());
  const selectMember = useCallback((userId: string | null) => {
    setSelectedMemberId(userId);
    setSwitchedAt(Date.now());
  }, []);
  const [openCheckIn, setOpenCheckIn] = useState<FeedItem | null>(null);
  const [openHabit, setOpenHabit] = useState<MemberHabitDetail | null>(null);

  // Rolagem da lista, lida no nativo para a roda acompanhar sem atraso
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  // Puxando para baixo no topo (valor negativo) a roda vai junto com a lista
  const wheelShift = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: "clamp",
  });
  // Enquanto a parte clara cobre a roda, ela escurece e vai um pouco para trás
  const wheelOpacity = scrollY.interpolate({
    inputRange: [0, WHEEL_FADE_DISTANCE],
    outputRange: [1, WHEEL_MIN_OPACITY],
    extrapolate: "clamp",
  });
  const wheelScale = scrollY.interpolate({
    inputRange: [0, WHEEL_FADE_DISTANCE],
    outputRange: [1, WHEEL_MIN_SCALE],
    extrapolate: "clamp",
  });

  // Dedo na roda: a lista para de rolar já no toque, antes do arraste
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handleTouchingChange = useCallback(
    (touching: boolean) => setScrollEnabled(!touching),
    [],
  );

  const habitsById = useMemo(
    () => new Map(feedGroupHabits.map((habit) => [habit.id, habit])),
    [],
  );
  const progress = useMemo(() => indexMemberProgress(feedHabitStats), []);
  const members = useMemo(() => membersToday(feedHabitStats), []);
  const totals = useMemo(() => groupToday(members), [members]);
  const asOf = feedHabitStats[0]?.as_of;

  const selectedMember = members.find(
    (member) => member.user.id === selectedMemberId,
  );

  const rows: Row[] = selectedMember
    ? // Feitos primeiro, como no Figma
      [...selectedMember.habits]
        .sort((a, b) => Number(b.done) - Number(a.done))
        .map((habit) => ({ kind: "habit", habit }))
    : feedPage.items.map((item) => ({ kind: "check-in", item }));

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
      // Cabeçalho escuro: relógio e bateria claros só enquanto a tela está na frente
      StatusBar.setStyle("light");
      return () => StatusBar.setStyle("auto");
    }, [refreshGroup]),
  );

  const openMemberHabit = (habit: MemberHabitToday) => {
    if (!selectedMember || !asOf) return;
    if (habit.done) {
      const checkIn = latestCheckIn(
        feedPage.items,
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
              {/* A roda desce o mesmo tanto que a lista sobe: fica parada na
                  tela e a parte clara passa por cima dela */}
              <Animated.View
                style={{
                  opacity: wheelOpacity,
                  transform: [
                    { translateY: wheelShift },
                    { scale: wheelScale },
                  ],
                }}
              >
                <MembersCircle
                  members={members}
                  group={totals}
                  selectedId={selectedMemberId}
                  onSelect={selectMember}
                  onTouchingChange={handleTouchingChange}
                />
              </Animated.View>
              <View style={styles.sheetTop}>
                {asOf && (
                  <View style={styles.week}>
                    <GroupWeek today={asOf} completeDays={feedCompleteDays} />
                  </View>
                )}
                {/* A `key` faz o título remontar e entrar animado a cada troca */}
                <FadeIn key={selectedMemberId ?? "all"} since={switchedAt}>
                  {selectedMember ? (
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
                    <View style={styles.titles}>
                      <Text style={styles.title}>Check-ins recentes</Text>
                      <Text style={styles.subtitle}>
                        O grupo em movimento, em tempo real.
                      </Text>
                    </View>
                  )}
                </FadeIn>
              </View>
            </>
          }
          ListFooterComponent={
            <View style={styles.links}>
              <Button
                variant="secondary"
                width="full"
                onPress={() => router.push(`/groups/${id}/habits` as Href)}
              >
                Hábitos
              </Button>
              <Button
                variant="secondary"
                width="full"
                onPress={() => router.push(`/groups/${id}/ranking` as Href)}
              >
                Ranking
              </Button>
              <Button
                variant="secondary"
                width="full"
                onPress={() => router.push(`/groups/${id}/about` as Href)}
              >
                Sobre
              </Button>
            </View>
          }
          // A parte clara vai até o fim da tela mesmo com poucos itens
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
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
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
  // Cada pedaço da parte clara tem fundo próprio; atrás deles fica a roda
  sheetTop: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 22,
    backgroundColor: palette.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  week: {
    marginBottom: 14,
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
  links: {
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 8,
  },
});
