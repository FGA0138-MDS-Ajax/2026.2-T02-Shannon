import { render } from "@testing-library/react-native";
import Index from "@/app/index";

describe("Index", () => {
  it("renders the default screen", async () => {
    const { getByText } = await render(<Index />);
    expect(getByText("Habbit")).toBeTruthy();
    expect(getByText("Criar uma conta")).toBeTruthy();
    expect(getByText("Já tenho uma conta")).toBeTruthy();
  });
});
