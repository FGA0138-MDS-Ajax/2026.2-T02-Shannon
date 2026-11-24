import { fireEvent, render } from "@testing-library/react-native";
import {
  StatisticsContent,
  StatisticsEmpty,
  StatisticsError,
  StatisticsFilters,
  StatisticsSkeleton,
} from "@/components/statistics";
import {
  atRiskStatistics,
  buildHistory,
  completeStatistics,
  fixtureWeek,
  noPeriodsStatistics,
} from "@/components/statistics/__fixtures__/statistics";
import HabitProgressItem from "@/components/statistics/habit-progress-item";

describe("StatisticsContent", () => {
  it("shows the summaries with complete data", async () => {
    const screen = await render(
      <StatisticsContent data={completeStatistics} userName="Breno Silva" />,
    );

    expect(screen.getByText("Olá, Breno!")).toBeTruthy();
    expect(screen.getByText("Check-ins no mês")).toBeTruthy();
    expect(screen.getByText("4 nesta semana")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("7 de 10 períodos")).toBeTruthy();
    expect(screen.getByText("3 hábitos ativos")).toBeTruthy();
    expect(screen.getByText("1 hábito concluído hoje")).toBeTruthy();
    expect(screen.getByText("1/3 hoje")).toBeTruthy();
  });

  it("lists every habit from habit_progress with its progress", async () => {
    const screen = await render(
      <StatisticsContent data={completeStatistics} />,
    );

    expect(screen.getByText("Beber 2L de água")).toBeTruthy();
    expect(screen.getByText("Ler 10 páginas")).toBeTruthy();
    expect(screen.getByText("Correr 5 km")).toBeTruthy();
    expect(screen.getByText("1 de 1 hoje")).toBeTruthy();
    expect(screen.getByText("1 de 3 nesta semana")).toBeTruthy();
  });

  it("lists the habits still pending today before the ones already done", async () => {
    // Na fixture, só "Beber 2L de água" (o primeiro da API) foi feito hoje
    const screen = await render(
      <StatisticsContent data={completeStatistics} />,
    );
    const cards = screen.getAllByTestId(/^habit-progress-/);

    expect(cards.map((card) => card.props.testID)).toEqual([
      "habit-progress-habit-reading",
      "habit-progress-habit-running",
      "habit-progress-habit-water",
    ]);
  });

  it("marks the habits done today and keeps the button on the others", async () => {
    const screen = await render(
      <StatisticsContent data={atRiskStatistics} onCheckIn={jest.fn()} />,
    );

    expect(screen.queryByTestId("habit-done-habit-water")).toBeNull();
    expect(screen.getAllByText("Check-in")).toHaveLength(3);

    await screen.rerender(
      <StatisticsContent data={completeStatistics} onCheckIn={jest.fn()} />,
    );

    expect(screen.getByTestId("habit-done-habit-water")).toBeTruthy();
    expect(screen.getByText("Feito hoje")).toBeTruthy();
    expect(screen.getAllByText("Check-in")).toHaveLength(2);
  });

  it("shows 'Sem dados ainda' instead of 0% without periods", async () => {
    const screen = await render(
      <StatisticsContent data={noPeriodsStatistics} />,
    );

    expect(screen.getByText("Sem dados ainda")).toBeTruthy();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("keeps zero days in the series, in ascending order", async () => {
    const shuffled = {
      ...completeStatistics,
      series: {
        ...completeStatistics.series,
        points: [...completeStatistics.series.points].reverse(),
      },
    };

    const screen = await render(<StatisticsContent data={shuffled} />);
    const bars = screen.getAllByTestId(/^checkins-bar-/);

    expect(bars).toHaveLength(30);
    expect(bars[0].props.testID).toBe("checkins-bar-2026-10-15");
    expect(bars[29].props.testID).toBe("checkins-bar-2026-11-13");
  });

  it("uses the rolling labels when mode is rolling", async () => {
    const screen = await render(
      <StatisticsContent data={{ ...completeStatistics, mode: "rolling" }} />,
    );

    expect(screen.getByText("Check-ins em 30 dias")).toBeTruthy();
    expect(screen.getByText("4 em 7 dias")).toBeTruthy();
  });

  it("fills only the days where every habit was done", async () => {
    const screen = await render(
      <StatisticsContent data={completeStatistics} week={fixtureWeek} />,
    );

    // 9/11 teve 2 de 2: bolinha cheia. 10/11 teve 1 de 2: anel parcial
    expect(screen.getByTestId("day-ring-9-complete")).toBeTruthy();
    expect(screen.getByLabelText("10, 1 de 2 hábitos")).toBeTruthy();
    expect(screen.queryByTestId("day-ring-10-complete")).toBeNull();
  });

  it("sends the habit id when its check-in button is pressed", async () => {
    const onCheckIn = jest.fn();
    const screen = await render(
      <StatisticsContent data={completeStatistics} onCheckIn={onCheckIn} />,
    );

    await fireEvent.press(
      screen.getByLabelText("Fazer check-in em Ler 10 páginas"),
    );

    expect(onCheckIn).toHaveBeenCalledWith("habit-reading");
  });
});

describe("HabitProgressItem", () => {
  const [habit] = completeStatistics.habit_progress;

  it("draws the 28-day history", async () => {
    const screen = await render(
      <HabitProgressItem habit={habit} history={buildHistory([0, 3])} />,
    );

    expect(screen.getByText("últimos 28 dias")).toBeTruthy();
    expect(screen.getAllByTestId(/^history-/)).toHaveLength(28);
    expect(screen.getAllByTestId(/-checked$/)).toHaveLength(2);
  });

  it("keeps an empty grid while the history loads, marking today", async () => {
    const screen = await render(<HabitProgressItem habit={habit} />);

    // A fixture tem checked_today: true
    expect(screen.getAllByTestId(/^history-/)).toHaveLength(28);
    expect(screen.getAllByTestId(/-checked$/)).toHaveLength(1);
  });

  it("hides the check-in button of a finished habit", async () => {
    const screen = await render(
      <HabitProgressItem
        habit={{ ...habit, status: "ended" }}
        onCheckIn={jest.fn()}
      />,
    );

    expect(screen.getByText("Encerrado")).toBeTruthy();
    expect(screen.queryByText("Check-in")).toBeNull();
  });
});

describe("StatisticsEmpty", () => {
  it("shows a friendly message with zeroed values", async () => {
    const screen = await render(<StatisticsEmpty />);

    expect(
      screen.getByText(
        "Faça seu primeiro check-in para ver suas estatísticas.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});

describe("StatisticsSkeleton", () => {
  it("announces the loading state", async () => {
    const screen = await render(<StatisticsSkeleton />);

    expect(screen.getByText("Carregando estatísticas...")).toBeTruthy();
  });
});

describe("StatisticsError", () => {
  it("shows the message and retries", async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <StatisticsError message="Sem conexão." onRetry={onRetry} />,
    );

    await fireEvent.press(screen.getByText("Tentar novamente"));

    expect(screen.getByText("Sem conexão.")).toBeTruthy();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("StatisticsFilters", () => {
  it("changes the mode", async () => {
    const onChange = jest.fn();
    const screen = await render(
      <StatisticsFilters mode="calendar" days={30} onChange={onChange} />,
    );

    await fireEvent.press(screen.getByText("Últimos 7 e 30 dias"));

    expect(onChange).toHaveBeenCalledWith({ mode: "rolling", days: 30 });
  });

  it("flags days outside 1 to 365 while typing", async () => {
    const screen = await render(
      <StatisticsFilters mode="calendar" days={30} onChange={jest.fn()} />,
    );

    await fireEvent.changeText(
      screen.getByTestId("statistics-days-input"),
      "0",
    );

    expect(screen.getByText("Escolha entre 1 e 365 dias.")).toBeTruthy();
  });

  it("shows the errors received by props", async () => {
    const screen = await render(
      <StatisticsFilters
        mode="calendar"
        days={30}
        errors={{ mode: "Modo inválido.", days: "Dias inválidos." }}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText("Modo inválido.")).toBeTruthy();
    expect(screen.getByText("Dias inválidos.")).toBeTruthy();
  });
});
