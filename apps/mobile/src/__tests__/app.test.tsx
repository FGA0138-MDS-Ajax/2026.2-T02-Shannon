import { render } from "@testing-library/react-native";
import Index from "@/app/index";

describe("Index", () => {
  it("renders the default screen", async () => {
    const { getByText } = await render(<Index />);
    expect(getByText(/edit src\/app\/index\.tsx/i)).toBeTruthy();
  });
});
