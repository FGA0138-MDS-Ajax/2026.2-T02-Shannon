import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";
import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/back-button";
import Button from "@/components/button";
import { GroupBadges } from "@/components/group-row";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { getErrorMessage } from "@/services/api-errors";
import { criterionLabels, endsOnLabel, membersLabel } from "@/utils/groups";

const SECTIONS: {
  path: string;
  icon: LucideIconName;
  title: string;
  hint: string;
}[] = [
  {
    path: "habits",
    icon: "list-checks",
    title: "Hábitos",
    hint: "O que o grupo faz junto",
  },
  {
    path: "feed",
    icon: "message-circle",
    title: "Feed",
    hint: "Os check-ins de todo mundo",
  },
  {
    path: "ranking",
    icon: "trophy",
    title: "Ranking",
    hint: "Quem está na frente",
  },
  {
    path: "about",
    icon: "info",
    title: "Sobre",
    hint: "Membros, convite e ajustes",
  },
];

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: group,
    error,
    isLoading,
    notFound,
    mutate: refreshGroup,
  } = useGroup(id);

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
    }, [refreshGroup]),
  );

  const renderContent = () => {
    if (isLoading && !group) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator
            testID="group-loading"
            size="large"
            color={theme.colors.primary}
          />
        </View>
      );
    }

    if (notFound) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>
            Este grupo não existe mais ou você não participa dele.
          </Text>
          <Button variant="secondary" onPress={() => router.back()}>
            Voltar para os grupos
          </Button>
        </View>
      );
    }

    if (!group) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>{getErrorMessage(error)}</Text>
          <Button variant="secondary" onPress={() => refreshGroup()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.name}>{group.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.detail}>{membersLabel(group.members_count)}</Text>
          <GroupBadges role={group.my_role} status={group.status} />
        </View>
        <Text style={styles.detail}>
          {criterionLabels[group.ranking_criterion]}
        </Text>
        <Text style={styles.detail}>{endsOnLabel(group)}</Text>
        {group.description && (
          <Text style={styles.description}>{group.description}</Text>
        )}

        <View style={styles.sections}>
          {SECTIONS.map((section) => (
            <Pressable
              key={section.path}
              accessibilityRole="button"
              onPress={() =>
                router.push(`/groups/${group.id}/${section.path}` as Href)
              }
              style={({ pressed }) => [
                styles.section,
                pressed && styles.sectionPressed,
              ]}
            >
              <Lucide
                name={section.icon}
                size={22}
                color={theme.colors.primary}
              />
              <View style={styles.sectionTexts}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.detail}>{section.hint}</Text>
              </View>
              <Lucide name="chevron-right" size={20} color={palette.inkSoft} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <BackButton />

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSoft,
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 32,
    gap: 4,
  },
  name: {
    fontFamily: theme.font.bold,
    fontSize: 42,
    lineHeight: 52,
    color: palette.ink,
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detail: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  description: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
  },
  sections: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray300,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  sectionPressed: {
    opacity: 0.6,
  },
  sectionTexts: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 18,
    color: palette.ink,
  },
});
