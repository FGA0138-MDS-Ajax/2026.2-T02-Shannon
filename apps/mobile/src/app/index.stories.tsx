import type { Meta, StoryObj } from "@storybook/react-native";
import Index from "./index";

const meta: Meta<typeof Index> = {
  title: "Screens/Index",
  component: Index,
};

export default meta;

type Story = StoryObj<typeof Index>;

export const Default: Story = {};
