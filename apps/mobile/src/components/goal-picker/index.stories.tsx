import type { Meta, StoryObj } from "@storybook/react-native";
import GoalPicker from "./index";

const meta: Meta<typeof GoalPicker> = {
  title: "Components/GoalPicker",
  component: GoalPicker,
  args: {
    label: "Meta",
    value: null,
    onChange: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof GoalPicker>;

export const Default: Story = {};

export const Daily: Story = {
  args: {
    value: { period: "day" },
  },
};

export const Weekly: Story = {
  args: {
    value: { period: "week", target_count: 4, period_end_weekday: 7 },
  },
};

export const Monthly: Story = {
  args: {
    value: { period: "month", target_count: 15 },
  },
};

export const WithError: Story = {
  args: {
    error: "Escolha o tipo da meta.",
  },
};
