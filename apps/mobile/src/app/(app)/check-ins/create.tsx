import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CategoryStep from "@/components/check-in-flow/category-step";
import DetailsStep from "@/components/check-in-flow/details-step";
import HabitStep from "@/components/check-in-flow/habit-step";
import ProgressSummary from "@/components/check-in-flow/progress-summary";
import {
  ErrorBanner,
  HeaderAction,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { useCheckInFlow } from "@/hooks/useCheckInFlow";

export default function CreateCheckInScreen() {
  const openCheckIn = (id: string) => router.replace(`/check-ins/${id}`);
  const flow = useCheckInFlow({ onOpenCheckIn: openCheckIn });

  const renderContent = () => {
    if (flow.created) {
      return (
        <ProgressSummary
          items={flow.created.items}
          onViewCheckIn={() => flow.created && openCheckIn(flow.created.id)}
        />
      );
    }

    // O erro vale para as duas primeiras etapas; o botão repete o que falhou
    if (flow.loadError) {
      return (
        <View style={styles.error}>
          <ErrorBanner message={flow.loadError} onRetry={flow.retryLoad} />
        </View>
      );
    }

    switch (flow.step) {
      case "categories":
        return (
          <CategoryStep
            categories={flow.categoriesLoading ? null : flow.categories}
            onSelect={flow.openCategory}
          />
        );
      case "habits":
        return (
          <HabitStep
            category={flow.category}
            options={flow.options}
            selected={flow.selected}
            rejection={flow.rejection}
            notice={flow.notice}
            hasMore={flow.hasMoreExtra}
            loadingMore={flow.loadingMore}
            onToggle={flow.toggleHabit}
            onLoadMore={flow.loadMore}
            onContinue={() => flow.setStep("details")}
          />
        );
      case "details":
        return (
          <DetailsStep
            values={flow.fields}
            errors={flow.fieldErrors}
            formError={flow.formError}
            habitCount={flow.selected.size}
            submitting={flow.submitting}
            onChange={flow.setFields}
            onSubmit={flow.submit}
          />
        );
    }
  };

  const renderSubtitle = () => {
    if (flow.created) {
      return (
        <Text style={styles.subtitle}>Check-in salvo! Seu progresso:</Text>
      );
    }
    if (flow.step === "categories") {
      return <Text style={styles.subtitle}>Escolha uma categoria</Text>;
    }

    const back =
      flow.step === "habits"
        ? {
            label: flow.category && habitCategoryLabels[flow.category],
            onPress: flow.backToCategories,
          }
        : { label: "Hábitos", onPress: () => flow.setStep("habits") };

    return (
      <Pressable
        testID="back-button"
        onPress={back.onPress}
        disabled={flow.submitting}
        hitSlop={8}
      >
        <View style={styles.backLink}>
          <Lucide
            name="arrow-left"
            size={16}
            color={theme.colors.primaryDark}
          />
          <Text style={styles.backLinkText}>{back.label}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Check-in"
        action={
          <HeaderAction
            label={flow.created ? "Fechar" : "Cancelar"}
            onPress={() => router.back()}
          />
        }
      />
      {renderSubtitle()}
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  backLinkText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  error: {
    marginTop: 16,
  },
});
