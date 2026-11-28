import { render } from "@testing-library/react-native";
import HabitStep from "@/components/check-in-flow/habit-step";
import { getRejectedHabitIds } from "@/services/api-errors";
import { matchCheckInProgress } from "@/utils/check-in-progress";
import { ApiError } from "@/services/api";
import type { HabitOption, HabitProgress } from "@/services/types/habits";

const option: HabitOption = {
  id: "h1", name: "Correr", category: "corrida",
  group: { id: "group-1", name: "Corrida matinal" }, preselected: false,
};

it("nas opções de hábito, mostra o nome do grupo ao lado quando HabitOption.group existe", async () => {
  const screen = await render(
    <HabitStep category="corrida" options={[option]} selected={new Set()} rejection={null} notice={null}
      hasMore={false} loadingMore={false} onToggle={() => {}} onLoadMore={() => {}} onContinue={() => {}} />,
  );
  expect(screen.getByText("Corrida matinal")).toBeTruthy();

  const personal = await render(
    <HabitStep category="corrida" options={[{ ...option, group: null }]} selected={new Set()} rejection={null} notice={null}
      hasMore={false} loadingMore={false} onToggle={() => {}} onLoadMore={() => {}} onContinue={() => {}} />,
  );
  expect(personal.queryByText("Corrida matinal")).toBeNull();
});

it("erro 404 de hábito de grupo usa getRejectedHabitIds", () => {
  const err = new ApiError("Hábito não encontrado.", 404, { detail: "x", habit_ids: ["h1", "h2"] });
  expect(getRejectedHabitIds(err)).toEqual(["h1", "h2"]);
  // 403/409 também
  expect(getRejectedHabitIds(new ApiError("x", 409, { habit_ids: ["h1"] }))).toEqual(["h1"]);
  // sem habit_ids -> []
  expect(getRejectedHabitIds(new ApiError("x", 404, {}))).toEqual([]);
});

it("progress da resposta do check-in vem correto (sem contorno extra)", () => {
  const progress = { habit_id: "h1", status: "completed" } as HabitProgress;
  const items = matchCheckInProgress([{ id: "h1", name: "Correr" }], [progress]);
  expect(items[0].progress.status).toBe("completed");
});
