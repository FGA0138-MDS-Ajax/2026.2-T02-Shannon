import { fireEvent, render } from "@testing-library/react-native";
import CheckInItem from "@/components/check-in-item";
import { CheckInPhoto } from "@/components/check-in-photo";
import { FeedCard } from "@/components/groups/feed-cards";
import type { FeedItem } from "@/services/types/groups";
import type { CheckIn } from "@/services/types/habits";

jest.mock("expo-image", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});

const photo = {
  thumbnail_url: "https://cdn.example.com/thumb.jpg?token=1",
  url: "https://cdn.example.com/full.jpg?token=1",
};

const checkIn: CheckIn = {
  id: "check-in-1",
  user_id: "user-1",
  title: "Corrida matinal",
  description: "5 km",
  created_at: "2026-11-27T14:30:00Z",
  duration: "PT30M",
  habit_ids: ["habit-1"],
  photo,
};

const feedItem: FeedItem = {
  cursor: "c1",
  id: "feed-1",
  author: { id: "user-1", username: "joaosilva" },
  title: "Corrida matinal",
  description: null,
  habits: [{ id: "habit-1", name: "Correr" }],
  created_at: "2026-11-27T14:30:00Z",
  photo: {
    thumbnail_url: "https://cdn.example.com/feed-thumb.jpg?token=1",
    url: null,
  },
};

describe("CheckInPhoto", () => {
  it("usa a miniatura e uma chave de cache estável", async () => {
    const screen = await render(
      <CheckInPhoto checkInId="check-in-1" photo={photo} />,
    );

    const image = screen.getByTestId("check-in-photo-check-in-1");
    expect(image.props.source).toEqual({
      uri: photo.thumbnail_url,
      cacheKey: "check-in-1:https://cdn.example.com/thumb.jpg",
    });
    expect(image.props.accessibilityLabel).toBe("Foto do check-in");
  });

  it("usa a URL cheia no detalhe", async () => {
    const screen = await render(
      <CheckInPhoto
        checkInId="check-in-1"
        photo={photo}
        variant="full"
        testID="foto-cheia"
      />,
    );

    expect(screen.getByTestId("foto-cheia").props.source.uri).toBe(photo.url);
  });

  it("cai na miniatura quando a URL cheia não veio", async () => {
    const screen = await render(
      <CheckInPhoto
        checkInId="check-in-1"
        photo={{ ...photo, url: null }}
        variant="full"
        testID="foto-cheia"
      />,
    );

    expect(screen.getByTestId("foto-cheia").props.source.uri).toBe(
      photo.thumbnail_url,
    );
  });

  it("repassa o erro de carregamento", async () => {
    const onError = jest.fn();
    const screen = await render(
      <CheckInPhoto
        checkInId="check-in-1"
        photo={photo}
        onError={onError}
      />,
    );

    fireEvent(screen.getByTestId("check-in-photo-check-in-1"), "error");
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("miniaturas nas listas", () => {
  it("mostra a miniatura no item da lista de check-ins", async () => {
    const screen = await render(
      <CheckInItem checkIn={checkIn} onPress={jest.fn()} />,
    );

    expect(screen.getByTestId("check-in-thumbnail-check-in-1")).toBeTruthy();
  });

  it("não reserva espaço de foto quando o check-in não tem foto", async () => {
    const screen = await render(
      <CheckInItem
        checkIn={{ ...checkIn, photo: null }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("check-in-thumbnail-check-in-1")).toBeNull();
  });

  it("mostra a miniatura no feed do grupo", async () => {
    const screen = await render(
      <FeedCard item={feedItem} isMine={false} onPress={jest.fn()} />,
    );

    expect(screen.getByTestId("feed-thumbnail-feed-1")).toBeTruthy();
  });
});
