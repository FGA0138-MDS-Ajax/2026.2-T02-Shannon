import type { Meta, StoryObj } from "@storybook/react-native";
import HabitForm from "./index";

const meta: Meta<typeof HabitForm> = {
  title: "Components/HabitForm",
  component: HabitForm,
  args: {
    submitLabel: "Criar hábito",
    submittingLabel: "Criando...",
    onSubmit: async () => {},
  },
};

export default meta;

type Story = StoryObj<typeof HabitForm>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    submitLabel: "Salvar",
    submittingLabel: "Salvando...",
    initialValues: {
      name: "Correr 5 km",
      category: "corrida",
      description: "Três vezes por semana",
      is_public: true,
      target_end_date: "2026-12-31",
    },
  },
};
