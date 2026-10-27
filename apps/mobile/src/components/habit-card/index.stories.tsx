import type { Meta, StoryObj } from "@storybook/react-native";
import HabitCard from "./index";

const meta: Meta<typeof HabitCard> = {
  title: "Components/HabitCard",
  component: HabitCard,
  args: {
    habit: {
      id: "1",
      name: "Correr 5 km",
      description: null,
      category: "corrida",
      is_public: true,
      status: "active",
      author_user_id: "1",
      created_at: "2026-10-10",
      target_end_date: null,
      finished_at: null,
    },
  },
};

export default meta;

type Story = StoryObj<typeof HabitCard>;

export const Default: Story = {};

export const Finished: Story = {
  args: {
    habit: {
      id: "2",
      name: "Ler 10 páginas",
      description: "Antes de dormir",
      category: "leitura",
      is_public: false,
      status: "finished",
      author_user_id: "1",
      created_at: "2026-10-01",
      target_end_date: null,
      finished_at: "2026-10-20",
    },
  },
};
