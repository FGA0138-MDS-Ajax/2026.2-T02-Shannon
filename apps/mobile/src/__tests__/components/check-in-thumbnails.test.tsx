import { act, render } from "@testing-library/react-native";
import CheckInItem from "@/components/check-in-item";
import { FeedCard } from "@/components/groups/feed-cards";
import type { FeedItem } from "@/services/types/groups";
import type { CheckIn } from "@/services/types/habits";

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return { Image: (props: object) => <View {...props} /> };
});

// Nas listas a API manda só a miniatura
const thumb = {
  thumbnail_url: "https://storage/check-ins/c1/a-thumb.jpg?sig=1",
  url: null,
};

const checkIn: CheckIn = {
  id: "c1",
  user_id: "u1",
  title: "Pedal no parque",
  description: null,
  created_at: "2026-11-27T12:00:00Z",
  duration: null,
  habit_ids: ["h1"],
  photo: thumb,
};

const feedItem: FeedItem = {
  cursor: "x",
  id: "c1",
  author: { id: "u1", username: "ana" },
  title: "Pedal no parque",
  description: null,
  habits: [{ id: "h1", name: "Pedalar" }],
  created_at: "2026-11-27T12:00:00Z",
  photo: thumb,
};

describe("thumbnails in lists", () => {
  it("shows the thumbnail in the check-in list and refreshes it when expired", async () => {
    const onPhotoExpired = jest.fn();
    const screen = await render(
      <CheckInItem
        checkIn={checkIn}
        onPress={jest.fn()}
        onPhotoExpired={onPhotoExpired}
      />,
    );

    const image = screen.getByTestId("check-in-photo");
    expect(image.props.source.uri).toBe(thumb.thumbnail_url);

    await act(() => image.props.onError());
    expect(onPhotoExpired).toHaveBeenCalledTimes(1);
  });

  it("shows no image when the check-in has no photo", async () => {
    const screen = await render(
      <CheckInItem checkIn={{ ...checkIn, photo: null }} onPress={jest.fn()} />,
    );

    expect(screen.queryByTestId("check-in-photo")).toBeNull();
  });

  it("shows the thumbnail in the group feed", async () => {
    const screen = await render(
      <FeedCard item={feedItem} isMine={false} onPress={jest.fn()} />,
    );

    expect(screen.getByTestId("check-in-photo").props.source.uri).toBe(
      thumb.thumbnail_url,
    );
  });
});
