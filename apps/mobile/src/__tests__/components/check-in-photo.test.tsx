import { act, render } from "@testing-library/react-native";
import CheckInPhoto, { photoCacheKey } from "@/components/check-in-photo";

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return { Image: (props: object) => <View {...props} /> };
});

const photo = {
  thumbnail_url: "https://storage/check-ins/c1/a-thumb.jpg?X-Amz-Signature=1",
  url: "https://storage/check-ins/c1/a-full.jpg?X-Amz-Signature=1",
};

describe("photoCacheKey", () => {
  it("ignores the signature, which changes on every response", () => {
    expect(photoCacheKey(photo.thumbnail_url)).toBe(
      photoCacheKey(photo.thumbnail_url.replace("=1", "=2")),
    );
    expect(photoCacheKey(photo.thumbnail_url)).toBe(
      "https://storage/check-ins/c1/a-thumb.jpg",
    );
  });
});

describe("CheckInPhoto", () => {
  it("uses the full photo in the detail and the thumbnail in lists", async () => {
    const full = await render(<CheckInPhoto photo={photo} variant="full" />);
    expect(full.getByTestId("check-in-photo").props.source).toEqual({
      uri: photo.url,
      cacheKey: "https://storage/check-ins/c1/a-full.jpg",
    });

    const thumb = await render(
      <CheckInPhoto photo={{ ...photo, url: null }} variant="thumb" />,
    );
    expect(thumb.getByTestId("check-in-photo").props.source.uri).toBe(
      photo.thumbnail_url,
    );
  });

  it("asks for new URLs once and then shows a placeholder", async () => {
    const onExpired = jest.fn();
    const screen = await render(
      <CheckInPhoto photo={photo} variant="full" onExpired={onExpired} />,
    );

    await act(() => screen.getByTestId("check-in-photo").props.onError());
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("check-in-photo-unavailable")).toBeNull();

    await act(() => screen.getByTestId("check-in-photo").props.onError());
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Não foi possível carregar a foto.")).toBeTruthy();
  });

  it("tries again from scratch when the photo is replaced", async () => {
    const onExpired = jest.fn();
    const screen = await render(
      <CheckInPhoto photo={photo} variant="full" onExpired={onExpired} />,
    );
    await act(() => screen.getByTestId("check-in-photo").props.onError());
    await act(() => screen.getByTestId("check-in-photo").props.onError());

    await screen.rerender(
      <CheckInPhoto
        photo={{ ...photo, url: photo.url.replace("a-full", "b-full") }}
        variant="full"
        onExpired={onExpired}
      />,
    );

    expect(screen.getByTestId("check-in-photo")).toBeTruthy();
  });
});
