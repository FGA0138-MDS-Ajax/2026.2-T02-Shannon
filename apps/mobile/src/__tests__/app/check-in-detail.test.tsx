import {
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { SWRConfig } from "swr";
import CheckInDetailScreen from "@/app/(app)/check-ins/[id]";
import { useSession } from "@/hooks/useSession";
import { ApiError, request } from "@/services/api";
import {
  removeCheckInPhoto,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { pickPhoto, preparePhoto } from "@/utils/photo";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: "check-in-1" }),
  // Não dispara refresh no mount; o teste controla quando a tela "foca".
  useFocusEffect: () => {},
}));

jest.mock("expo-image", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

jest.mock("@/services/check-ins-api", () => ({
  ...jest.requireActual("@/services/check-ins-api"),
  uploadCheckInPhoto: jest.fn(),
  removeCheckInPhoto: jest.fn(),
}));

jest.mock("@/utils/photo", () => ({
  PhotoTooLargeError: class extends Error {},
  PhotoPermissionError: class extends Error {},
  pickPhoto: jest.fn(),
  preparePhoto: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockRequest = request as jest.MockedFunction<typeof request>;
const mockUpload = uploadCheckInPhoto as jest.MockedFunction<
  typeof uploadCheckInPhoto
>;
const mockRemove = removeCheckInPhoto as jest.MockedFunction<
  typeof removeCheckInPhoto
>;
const mockPick = pickPhoto as jest.MockedFunction<typeof pickPhoto>;
const mockPrepare = preparePhoto as jest.MockedFunction<typeof preparePhoto>;
const { router } = jest.requireMock("expo-router");

const photo = {
  thumbnail_url: "https://cdn.example.com/thumb.jpg?token=1",
  url: "https://cdn.example.com/full.jpg?token=1",
};

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "check-in-1",
    user_id: "user-1",
    title: "Corrida matinal",
    description: "5 km no parque",
    created_at: new Date().toISOString(),
    duration: "PT30M",
    habit_ids: ["habit-1"],
    photo,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CheckInDetailScreen />
    </SWRConfig>,
  );
}

const file = {
  uri: "file:///tmp/foto.jpg",
  name: "check-in.jpg",
  type: "image/jpeg",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({
    user: {
      id: "user-1",
      name: "João Silva",
      username: "joaosilva",
      email: "joao@example.com",
    },
    session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    replaceTokens: jest.fn(),
  });
  mockPick.mockResolvedValue({
    uri: "file:///tmp/original.heic",
  } as never);
  mockPrepare.mockResolvedValue(file);
  mockUpload.mockResolvedValue(photo);
  mockRemove.mockResolvedValue(undefined);
});

describe("CheckInDetailScreen: foto", () => {
  it("mostra a imagem cheia no detalhe", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());

    const screen = await renderScreen();

    const image = await screen.findByTestId("check-in-photo-full");
    expect(image.props.source.uri).toBe(photo.url);
    expect(image.props.source.cacheKey).toBe(
      "check-in-1:https://cdn.example.com/full.jpg",
    );
  });

  it("mostra os controles só para o autor em check-in de hoje", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());

    const screen = await renderScreen();

    expect(await screen.findByTestId("photo-library-button")).toBeTruthy();
    expect(screen.getByTestId("photo-camera-button")).toBeTruthy();
    expect(screen.getByTestId("photo-remove-button")).toBeTruthy();
  });

  it("esconde os controles para check-in de outra pessoa", async () => {
    mockRequest.mockResolvedValueOnce(
      makeCheckIn({ user_id: "outra-pessoa" }),
    );

    const screen = await renderScreen();

    await screen.findByTestId("check-in-photo-full");
    expect(screen.queryByTestId("photo-library-button")).toBeNull();
  });

  it("esconde os controles para check-in de outro dia em São Paulo", async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mockRequest.mockResolvedValueOnce(
      makeCheckIn({ created_at: twoDaysAgo.toISOString() }),
    );

    const screen = await renderScreen();

    await screen.findByTestId("check-in-photo-full");
    expect(screen.queryByTestId("photo-library-button")).toBeNull();
  });

  it("renova a URL assinada uma única vez quando a imagem falha", async () => {
    mockRequest
      .mockResolvedValueOnce(makeCheckIn())
      .mockResolvedValueOnce(
        makeCheckIn({
          photo: {
            thumbnail_url: "https://cdn.example.com/thumb.jpg?token=2",
            url: "https://cdn.example.com/full.jpg?token=2",
          },
        }),
      );

    const screen = await renderScreen();
    const image = await screen.findByTestId("check-in-photo-full");

    fireEvent(image, "error");
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    // A segunda falha não dispara outro GET: sem loop.
    fireEvent(screen.getByTestId("check-in-photo-full"), "error");
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  it("some com a imagem se a renovação devolver photo null", async () => {
    mockRequest
      .mockResolvedValueOnce(makeCheckIn())
      .mockResolvedValueOnce(makeCheckIn({ photo: null }));

    const screen = await renderScreen();
    const image = await screen.findByTestId("check-in-photo-full");

    fireEvent(image, "error");

    await waitFor(() => {
      expect(screen.queryByTestId("check-in-photo-full")).toBeNull();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("envia a foto escolhida e atualiza a imagem", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn({ photo: null }));

    const screen = await renderScreen();
    await screen.findByTestId("photo-library-button");
    fireEvent.press(screen.getByTestId("photo-library-button"));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith("check-in-1", file);
    });
    await waitFor(() => {
      expect(screen.getByTestId("check-in-photo-full")).toBeTruthy();
    });
  });

  it("esconde os controles depois de 403 ou 409", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());
    mockUpload.mockRejectedValueOnce(new ApiError("Sem permissão", 403));

    const screen = await renderScreen();
    await screen.findByTestId("photo-library-button");
    fireEvent.press(screen.getByTestId("photo-library-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("photo-library-button")).toBeNull();
    });
  });

  it("volta para a lista quando o check-in não existe mais (404)", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());
    mockUpload.mockRejectedValueOnce(new ApiError("sumiu", 404));

    const screen = await renderScreen();
    await screen.findByTestId("photo-library-button");
    fireEvent.press(screen.getByTestId("photo-library-button"));

    await waitFor(() => {
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  it("mostra 400, 413 e 415 sem tirar os controles", async () => {
    const cases: [ApiError, string][] = [
      [new ApiError("inválida", 400), "Arquivo de imagem inválido. Escolha outra foto."],
      [new ApiError("grande", 413), "A foto deve ter no máximo 4 MB."],
      [
        new ApiError("formato", 415),
        "Formato não suportado. Envie uma imagem JPEG ou PNG.",
      ],
    ];

    for (const [error, message] of cases) {
      mockRequest.mockResolvedValueOnce(makeCheckIn());
      mockUpload.mockRejectedValueOnce(error);

      const screen = await renderScreen();
      await screen.findByTestId("photo-library-button");
      fireEvent.press(screen.getByTestId("photo-library-button"));

      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.getByTestId("photo-library-button")).toBeTruthy();
      await screen.unmount();
      jest.clearAllMocks();
    }
  });

  it("permite tentar de novo com a mesma imagem depois de 503", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());
    mockUpload.mockRejectedValueOnce(
      new ApiError("Não foi possível salvar a foto. Tente novamente.", 503),
    );

    const screen = await renderScreen();
    await screen.findByTestId("photo-library-button");
    fireEvent.press(screen.getByTestId("photo-library-button"));

    expect(
      await screen.findByText(
        "Não foi possível salvar a foto. Tente novamente.",
      ),
    ).toBeTruthy();

    mockUpload.mockResolvedValueOnce(photo);
    fireEvent.press(screen.getByText("Tentar novamente"));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(2);
    });
    expect(mockPick).toHaveBeenCalledTimes(1);
  });

  it("remove a foto depois da confirmação", async () => {
    mockRequest.mockResolvedValueOnce(makeCheckIn());
    const alert = jest.spyOn(Alert, "alert");

    const screen = await renderScreen();
    await screen.findByTestId("photo-remove-button");
    fireEvent.press(screen.getByTestId("photo-remove-button"));

    const buttons = alert.mock.calls[0][2] as {
      text: string;
      onPress?: () => void;
    }[];
    const confirm = buttons.find((button) => button.text === "Remover");
    await confirm?.onPress?.();

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("check-in-1");
    });
    await waitFor(() => {
      expect(screen.queryByTestId("check-in-photo-full")).toBeNull();
    });
  });
});
