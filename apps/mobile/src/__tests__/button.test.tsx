import { fireEvent, render } from "@testing-library/react-native";
import Button from "@/components/button";

describe("Button", () => {
  it("renders with text content correctly", async () => {
    const { getByText, getByTestId } = await render(
      <Button>Clique aqui</Button>,
    );
    expect(getByText("Clique aqui")).toBeTruthy();
    expect(getByTestId("button")).toBeTruthy();
  });

  it("handles onPress events", async () => {
    const onPressMock = jest.fn();
    const { getByTestId } = await render(
      <Button onPress={onPressMock}>Pressione</Button>,
    );

    fireEvent.press(getByTestId("button"));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("supports prefix and suffix elements", async () => {
    const { getByText } = await render(
      <Button prefix="👉" suffix="👈">
        Avançar
      </Button>,
    );

    expect(getByText("👉")).toBeTruthy();
    expect(getByText("Avançar")).toBeTruthy();
    expect(getByText("👈")).toBeTruthy();
  });
});
