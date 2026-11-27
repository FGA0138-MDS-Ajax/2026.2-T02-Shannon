import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";
import { HeroLayout, HeroTopBar, SegmentedTabs } from "@/components/ui";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

describe("HeroLayout", () => {
  it("renders the header, the hero and the sheet", async () => {
    const screen = await render(
      <HeroLayout
        header={<HeroTopBar title="Corrida" />}
        hero={<Text>Topo escuro</Text>}
      >
        <Text>Conteúdo da folha</Text>
      </HeroLayout>,
    );

    expect(screen.getByText("Corrida")).toBeTruthy();
    expect(screen.getByText("Topo escuro")).toBeTruthy();
    expect(screen.getByText("Conteúdo da folha")).toBeTruthy();
  });
});

describe("HeroTopBar", () => {
  it("goes back and runs the action", async () => {
    const onAction = jest.fn();
    const screen = await render(
      <HeroTopBar
        title="Grupo"
        actionLabel="Editar"
        actionTestID="edit"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByTestId("back-button"));
    await fireEvent.press(screen.getByTestId("edit"));

    expect(router.back).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalled();
  });

  it("hides the action without a label", async () => {
    const screen = await render(<HeroTopBar title="Grupo" />);

    expect(screen.queryByText("Editar")).toBeNull();
  });
});

describe("SegmentedTabs", () => {
  const options = [
    { value: "a", label: "Aba A" },
    { value: "b", label: "Aba B" },
  ];

  it("marks the selected tab and changes only to another one", async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SegmentedTabs
        options={options}
        value="a"
        onChange={onChange}
        testIDPrefix="t"
      />,
    );

    expect(screen.getByTestId("t-a")).toBeSelected();
    await fireEvent.press(screen.getByTestId("t-a"));
    await fireEvent.press(screen.getByTestId("t-b"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
