import { fireEvent, render, within } from "@testing-library/react-native";
import RankingPodium from "@/components/groups/ranking-podium";
import type { RankingItem } from "@/services/types/groups";

function item(position: number, id: string, score: number): RankingItem {
  return { position, user: { id, username: id }, score };
}

const colorOf = () => "#000000";

describe("RankingPodium", () => {
  it("keeps empty places in groups with fewer than 3 members", async () => {
    const screen = await render(
      <RankingPodium
        items={[item(1, "ana", 5), item(2, "caio", 3)]}
        criterion="check_ins"
        colorOf={colorOf}
        onOpenMember={jest.fn()}
      />,
    );

    expect(screen.getByTestId("podium-1-ana")).toBeTruthy();
    expect(screen.getByTestId("podium-2-caio")).toBeTruthy();
    expect(screen.queryByText("3º")).toBeNull();
  });

  it("shows tied members with the same place and names you", async () => {
    const onOpenMember = jest.fn();
    const screen = await render(
      <RankingPodium
        items={[item(1, "ana", 5), item(1, "me", 5), item(3, "bia", 1)]}
        criterion="goals"
        colorOf={colorOf}
        userId="me"
        onOpenMember={onOpenMember}
      />,
    );

    expect(screen.getAllByText("1º")).toHaveLength(2);
    const mine = screen.getByTestId("podium-1-me");
    expect(within(mine).getByText("Você")).toBeTruthy();

    await fireEvent.press(mine);
    expect(onOpenMember).toHaveBeenCalledWith("me");
  });
});
