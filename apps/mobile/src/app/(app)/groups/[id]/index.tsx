import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import GroupAbout from "@/components/groups/group-about";
import GroupHabits from "@/components/groups/group-habits";
import GroupHero, { type GroupTab } from "@/components/groups/group-hero";
import GroupOverviewTab from "@/components/groups/group-overview-tab";
import GroupRanking from "@/components/groups/group-ranking";
import {
  type ChipOption,
  FadeIn,
  HeroLayout,
  type HeroScrollRef,
  HeroTopBar,
  QueryState,
  SegmentedTabs,
} from "@/components/ui";
import { useGroupPeriod } from "@/hooks/useGroupPeriod";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { ApiError, request } from "@/services/api";
import { groupKeys } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";
import { memberColors } from "@/utils/group-period";

// Altura inicial do cabeçalho, perto da aba da roda (a maior), limitada a
// parte da tela em aparelhos pequenos. Depois vale a altura medida da roda
// naquele grupo: as outras abas usam a mesma e a barra de abas não pula.
const HERO_MIN_HEIGHT = 440;
const HERO_MAX_SHARE = 0.55;

const tabs: ChipOption<GroupTab>[] = [
  { value: "overview", label: "Visão geral" },
  { value: "habits", label: "Hábitos" },
  { value: "ranking", label: "Ranking" },
  { value: "about", label: "Sobre" },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const scrollRef = useRef<HeroScrollRef>(null);
  const [tab, setTab] = useState<GroupTab>("overview");
  // Pessoa escolhida na roda (ou no ranking): a Visão geral mostra os hábitos dela
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const initialHeroHeight = Math.min(
    HERO_MIN_HEIGHT,
    windowHeight * HERO_MAX_SHARE,
  );
  // Guardada por grupo: abrir outro grupo começa da altura inicial
  const [hero, setHero] = useState({ groupId: id, height: initialHeroHeight });
  const heroHeight = hero.groupId === id ? hero.height : initialHeroHeight;

  const { mutate } = useSWRConfig();
  const {
    data: group,
    error,
    mutate: refreshGroup,
  } = useSWR<GroupDetail>(groupKeys.detail(id), request);
  const board = useGroupPeriod(id, group?.members);
  const { refresh: refreshBoard } = board;

  useRefreshOnFocus(refreshGroup);
  useRefreshOnFocus(refreshBoard);
  usePageTitle(group?.name);

  // Grupo inexistente: mostra a mensagem e volta para a lista
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) {
      router.replace("/(app)/(tabs)/groups");
    }
  }, [error]);

  const colorOf = useMemo(
    () => memberColors(group?.members ?? []),
    [group?.members],
  );

  // O ranking só é buscado na aba dele; aqui só se avisa o cache
  const refreshAll = () =>
    Promise.all([
      refreshGroup(),
      refreshBoard(),
      mutate(groupKeys.ranking(id)),
      mutate(groupKeys.stats(id)),
    ]);
  const pull = usePullToRefresh(refreshAll);

  const changeTab = (next: GroupTab) => {
    setTab(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Quem não tem meta em nenhum hábito ativo não está na roda: abre o grupo todo
  const openMember = (userId: string) => {
    const inCircle = board.period?.members.some((m) => m.user.id === userId);
    setSelectedMemberId(inCircle ? userId : null);
    changeTab("overview");
  };

  const renderTab = (group: GroupDetail) => {
    switch (tab) {
      case "overview":
        return (
          <GroupOverviewTab
            group={group}
            board={board}
            userId={user?.id}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
          />
        );
      case "habits":
        return <GroupHabits group={group} period={board.period} />;
      case "ranking":
        return (
          <GroupRanking
            group={group}
            colorOf={colorOf}
            userId={user?.id}
            onOpenMember={openMember}
          />
        );
      case "about":
        return (
          <GroupAbout group={group} colorOf={colorOf} onChanged={refreshAll} />
        );
    }
  };

  return (
    <HeroLayout
      scrollRef={scrollRef}
      bottomInset
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      header={
        <HeroTopBar
          title={group?.name}
          actionLabel={group?.my_role === "admin" ? "Editar" : undefined}
          actionTestID="edit-group-button"
          onAction={() => router.push(`/groups/${id}/edit`)}
        />
      }
      hero={
        group && (
          // A `key` faz o cabeçalho de cada aba entrar animado
          <FadeIn key={tab}>
            <GroupHero
              tab={tab}
              group={group}
              period={board.period}
              periodError={board.error}
              colorOf={colorOf}
              userId={user?.id}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onOpenMember={openMember}
              onCreateHabit={
                group.my_role === "admin" && group.status === "active"
                  ? () => router.push(`/groups/${id}/habits/create`)
                  : undefined
              }
              minHeight={heroHeight}
              onHeight={(height) => {
                // Só a roda define a altura; as outras abas centralizam nela
                if (tab === "overview" && board.period) {
                  setHero({ groupId: id, height });
                }
              }}
            />
          </FadeIn>
        )
      }
    >
      <QueryState
        data={group}
        error={error}
        onRetry={() => refreshGroup()}
        notFoundMessage="Grupo não encontrado."
        loadingTestID="group-loading"
      >
        {(group) => (
          <>
            <View style={styles.tabs}>
              <SegmentedTabs
                options={tabs}
                value={tab}
                onChange={changeTab}
                testIDPrefix="group-tab"
              />
            </View>
            <FadeIn key={tab}>{renderTab(group)}</FadeIn>
          </>
        )}
      </QueryState>
    </HeroLayout>
  );
}

const styles = StyleSheet.create({
  tabs: {
    marginBottom: 20,
  },
});
