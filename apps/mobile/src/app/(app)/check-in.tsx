import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import Input from "@/components/input";
import LogoutButton from "@/components/logout-button";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
  getRejectedHabitIds,
} from "@/services/api-errors";
import {
  createCheckIn,
  listCheckInCategories,
  listHabitOptions,
} from "@/services/check-ins-api";
import type {
  CheckInCategory,
  CheckInCreate,
  HabitCategory,
  HabitOption,
} from "@/services/types/habits";
import { minutesToIsoDuration } from "@/utils/duration";

type Step = "categories" | "habits" | "details";

type FieldErrors = {
  title?: string;
  description?: string;
  duration?: string;
};

// Limite de hábitos por check-in aceito pela API
const MAX_HABITS = 20;
const EXTRA_PAGE_SIZE = 3;

export default function CheckInScreen() {
  // null = ainda carregando; [] = carregou, mas não há hábito elegível
  const [categories, setCategories] = useState<CheckInCategory[] | null>(null);
  // Falha ao carregar uma etapa inteira (categorias ou hábitos)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Em qual tela do fluxo a pessoa está
  const [step, setStep] = useState<Step>("categories");
  const [category, setCategory] = useState<HabitCategory | null>(null);
  // null = carregando os hábitos da categoria
  const [options, setOptions] = useState<HabitOption[] | null>(null);
  // Ids marcados. Fica separado de options: o preselected é a sugestão da
  // API, o selected é o que a pessoa decidiu
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // "Ver mais": hábitos das outras categorias, de 3 em 3
  const [extraPage, setExtraPage] = useState(0);
  const [hasMoreExtra, setHasMoreExtra] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Aviso em cima da lista de hábitos (limite, falha no "Ver mais", recusa)
  const [notice, setNotice] = useState<string | null>(null);
  // Hábitos recusados no último envio e o motivo dado pela API
  const [rejection, setRejection] = useState<{
    ids: Set<string>;
    reason: string;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ignora respostas de uma categoria que a pessoa já deixou
  const lastRequest = useRef(0);

  const loadCategories = useCallback(async () => {
    setCategories(null);
    setErrorMessage(null);
    try {
      const data = await listCheckInCategories();
      setCategories(data.categories);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  }, []);

  // A aba continua montada ao trocar de aba: recarrega sempre que ela volta
  // pro foco, senão um hábito criado agora não apareceria aqui
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const resetSelection = () => {
    lastRequest.current++;
    setOptions(null);
    setSelected(new Set());
    setExtraPage(0);
    setHasMoreExtra(false);
    setLoadingMore(false);
    setNotice(null);
    setRejection(null);
  };

  const openCategory = async (name: HabitCategory) => {
    resetSelection();
    const requestId = lastRequest.current;
    setStep("habits");
    setCategory(name);
    setErrorMessage(null);
    // Antes do primeiro "Ver mais", basta existir outra categoria elegível
    setHasMoreExtra(categories?.some((item) => item.name !== name) ?? false);

    try {
      const page = await listHabitOptions({ category: name });
      if (requestId !== lastRequest.current) return;
      setOptions(page.items);
      // Começa marcando só o que a API sugeriu (em "outros" ela não sugere nada)
      const suggested = page.items.filter((habit) => habit.preselected);
      setSelected(new Set(suggested.map((habit) => habit.id)));
    } catch (err: unknown) {
      if (requestId === lastRequest.current) {
        setErrorMessage(getErrorMessage(err));
      }
    }
  };

  const backToCategories = () => {
    resetSelection();
    setStep("categories");
    setCategory(null);
  };

  const loadMore = async () => {
    if (!category || loadingMore) return;
    const requestId = lastRequest.current;
    const nextPage = extraPage + 1;
    setLoadingMore(true);
    setNotice(null);

    try {
      const page = await listHabitOptions({
        exclude_category: category,
        page: nextPage,
        page_size: EXTRA_PAGE_SIZE,
      });
      if (requestId !== lastRequest.current) return;
      // Só acrescenta na lista: o que vem do "Ver mais" nunca chega marcado
      setOptions((prev) => [...(prev ?? []), ...page.items]);
      setExtraPage(nextPage);
      setHasMoreExtra(page.has_more);
    } catch (err: unknown) {
      if (requestId === lastRequest.current) {
        setNotice(getErrorMessage(err));
      }
    } finally {
      if (requestId === lastRequest.current) {
        setLoadingMore(false);
      }
    }
  };

  const toggleHabit = (id: string) => {
    setNotice(null);
    if (selected.has(id)) {
      const next = new Set(selected);
      next.delete(id);
      setSelected(next);
      return;
    }

    if (selected.size >= MAX_HABITS) {
      setNotice(`Você pode marcar no máximo ${MAX_HABITS} hábitos.`);
      return;
    }
    setSelected(new Set(selected).add(id));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedDuration = duration.trim();
    const errors: FieldErrors = {};

    if (!trimmedTitle) {
      errors.title = "Informe o título do check-in.";
    } else if (trimmedTitle.length > 150) {
      errors.title = "Use no máximo 150 caracteres.";
    }

    if (trimmedDescription.length > 500) {
      errors.description = "Use no máximo 500 caracteres.";
    }

    if (trimmedDuration && !/^\d+$/.test(trimmedDuration)) {
      errors.duration = "Use apenas números inteiros.";
    } else if (trimmedDuration && Number(trimmedDuration) <= 0) {
      errors.duration = "A duração deve ser maior que zero.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    // O Set já garante que não há ids repetidos
    const body: CheckInCreate = {
      title: trimmedTitle,
      habit_ids: [...selected],
    };
    if (trimmedDescription) body.description = trimmedDescription;
    if (trimmedDuration) {
      body.duration = minutesToIsoDuration(Number(trimmedDuration));
    }

    try {
      setSubmitting(true);
      setRejection(null);
      const checkIn = await createCheckIn(body);

      backToCategories();
      setTitle("");
      setDescription("");
      setDuration("");
      // Cast: os tipos gerados pelo Expo ainda não reconhecem o [id]
      router.push(`/check-ins/${checkIn.id}` as Href);
    } catch (err: unknown) {
      // Recusa (404, 403 ou 409): nada foi gravado. Volta pra lista com os
      // recusados destacados, mantendo o resto da seleção
      const rejectedIds = getRejectedHabitIds(err);
      if (rejectedIds.length > 0) {
        const reason = getErrorMessage(err);
        setRejection({ ids: new Set(rejectedIds), reason });
        setNotice(reason);
        setStep("habits");
        return;
      }

      // Erros por campo (422) vão embaixo de cada campo; o resto vai na faixa
      const {
        [FORM_ERROR_KEY]: bodyError,
        habit_ids: habitIdsError,
        ...apiFieldErrors
      } = getFieldErrors(err);
      setFieldErrors(apiFieldErrors);
      const otherError = bodyError ?? habitIdsError;
      if (otherError) {
        setFormError(otherError);
      } else if (Object.keys(apiFieldErrors).length === 0) {
        setFormError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderLoading = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const renderCategories = () => {
    if (categories === null) {
      return renderLoading();
    }

    if (categories.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.subtitle}>
            Você não tem hábitos ativos para registrar. Crie um na aba de
            hábitos!
          </Text>
        </View>
      );
    }

    // A API já manda em ordem alfabética, com "outros" por último
    return (
      <ScrollView contentContainerStyle={styles.list}>
        {categories.map((item) => (
          <Pressable
            key={item.name}
            testID={`category-${item.name}`}
            style={styles.card}
            onPress={() => openCategory(item.name)}
          >
            <Text style={styles.cardTitle}>
              {habitCategoryLabels[item.name]}
            </Text>
            <Text style={styles.cardDetail}>{item.habit_count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  const renderHabit = (habit: HabitOption) => {
    const isSelected = selected.has(habit.id);
    // Desmarcar um recusado já é a correção, então o destaque some junto
    const isRejected = isSelected && !!rejection?.ids.has(habit.id);

    return (
      <Pressable
        key={habit.id}
        testID={`habit-${habit.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        onPress={() => toggleHabit(habit.id)}
        style={[
          styles.card,
          styles.habit,
          isSelected && styles.habitSelected,
          isRejected && styles.habitRejected,
        ]}
      >
        <View style={styles.habitInfo}>
          <Text style={styles.cardTitle}>{habit.name}</Text>
          {habit.category !== category && (
            <Text style={styles.cardDetail}>
              {habitCategoryLabels[habit.category]}
            </Text>
          )}
          {habit.group && (
            <Text style={styles.cardDetail}>{habit.group.name}</Text>
          )}
          {isRejected && rejection && (
            <Text style={styles.rejectedText}>{rejection.reason}</Text>
          )}
        </View>
        <Text style={styles.check}>{isSelected ? "✓" : ""}</Text>
      </Pressable>
    );
  };

  const renderHabits = () => {
    if (options === null) {
      return renderLoading();
    }

    return (
      <>
        {notice && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{notice}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.list}>
          {options.length === 0 && (
            <Text style={styles.subtitle}>
              Nenhum hábito disponível nesta categoria.
            </Text>
          )}
          {options.map(renderHabit)}

          {hasMoreExtra && (
            <Button
              testID="see-more-button"
              variant="secondary"
              disabled={loadingMore}
              onPress={loadMore}
            >
              {loadingMore ? "Carregando..." : "Ver mais"}
            </Button>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.cardDetail}>
            {selected.size}/{MAX_HABITS} selecionados
          </Text>
          <Button
            testID="continue-button"
            variant="primary"
            disabled={selected.size === 0}
            onPress={() => setStep("details")}
          >
            Continuar
          </Button>
        </View>
      </>
    );
  };

  const renderDetails = () => (
    <>
      {formError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{formError}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          testID="check-in-title-input"
          label="Título"
          placeholder="ex: Treino de manhã"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
          maxLength={150}
          error={fieldErrors.title}
        />

        <Input
          testID="check-in-description-input"
          label="Descrição (opcional)"
          placeholder="Como foi?"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          error={fieldErrors.description}
        />

        <Input
          testID="check-in-duration-input"
          label="Duração em minutos (opcional)"
          placeholder="ex: 45"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          error={fieldErrors.duration}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.cardDetail}>
          {selected.size} {selected.size === 1 ? "hábito" : "hábitos"}
        </Text>
        <Button
          testID="submit-button"
          variant="primary"
          // Travado durante o envio pra não criar check-in duplicado
          disabled={submitting}
          onPress={handleSubmit}
        >
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </View>
    </>
  );

  const renderContent = () => {
    // O erro vale pras duas primeiras telas; o botão repete o que falhou
    if (errorMessage) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Button
            variant="secondary"
            onPress={() =>
              step === "habits" && category
                ? openCategory(category)
                : loadCategories()
            }
          >
            Tentar novamente
          </Button>
        </View>
      );
    }

    if (step === "categories") return renderCategories();
    if (step === "habits") return renderHabits();
    return renderDetails();
  };

  const renderSubtitle = () => {
    if (step === "categories") {
      return <Text style={styles.subtitle}>Escolha uma categoria</Text>;
    }

    const back =
      step === "habits"
        ? {
            label: category && habitCategoryLabels[category],
            onPress: backToCategories,
          }
        : { label: "Hábitos", onPress: () => setStep("habits") };

    return (
      <Pressable
        testID="back-button"
        onPress={back.onPress}
        disabled={submitting}
      >
        <Text style={styles.subtitle}>← {back.label}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Check-in</Text>
          <LogoutButton />
        </View>
        {renderSubtitle()}
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#B91C1C",
    textAlign: "center",
  },
  errorBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },
  errorBannerText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#B91C1C",
  },
  list: {
    gap: 8,
    paddingVertical: 16,
  },
  form: {
    paddingVertical: 16,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  cardTitle: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: "#1C1917",
  },
  cardDetail: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
  },
  habit: {
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  habitSelected: {
    borderColor: theme.colors.primary,
  },
  habitRejected: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  habitInfo: {
    flex: 1,
    gap: 4,
  },
  rejectedText: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#B91C1C",
  },
  check: {
    fontFamily: theme.font.bold,
    fontSize: 18,
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },
});
