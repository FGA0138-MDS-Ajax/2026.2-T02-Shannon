import type { Meta, StoryObj } from "@storybook/react-native";
import Input from "./index";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
