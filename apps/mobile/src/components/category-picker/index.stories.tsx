import type { Meta, StoryObj } from "@storybook/react-native";
import CategoryPicker from "./index";

const meta: Meta<typeof CategoryPicker> = {
  title: "Components/CategoryPicker",
  component: CategoryPicker,
  args: {
    label: "Categoria",
    value: null,
    onChange: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof CategoryPicker>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    value: "corrida",
  },
};

export const WithError: Story = {
  args: {
    error: "Escolha uma categoria.",
  },
};
