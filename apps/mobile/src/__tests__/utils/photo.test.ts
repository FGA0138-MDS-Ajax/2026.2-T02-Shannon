import * as ImagePicker from "expo-image-picker";
import {
  PhotoPermissionError,
  PhotoTooLargeError,
  pickPhoto,
  preparePhoto,
} from "@/utils/photo";

const mockSizes = new Map<string, number>();
const mockSave = jest.fn();
const mockRender = jest.fn();
const mockManipulate = jest.fn();

jest.mock("expo-file-system", () => ({
  File: class {
    size: number;
    constructor(uri: string) {
      this.size = mockSizes.get(uri) ?? 0;
    }
  },
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
  ImageManipulator: {
    manipulate: (...args: unknown[]) => mockManipulate(...args),
  },
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const asset = {
  uri: "file:///tmp/foto.heic",
  width: 4032,
  height: 3024,
  fileName: "foto.heic",
  mimeType: "image/heic",
} as ImagePicker.ImagePickerAsset;

beforeEach(() => {
  jest.clearAllMocks();
  mockSizes.clear();
  mockRender.mockResolvedValue({ saveAsync: mockSave });
  mockManipulate.mockReturnValue({ renderAsync: mockRender });
});

describe("preparePhoto", () => {
  it("converte para JPEG e limita o lado maior a 1600 px", async () => {
    mockSave.mockImplementation(async () => {
      mockSizes.set("file:///tmp/out-1.jpg", 1024);
      return { uri: "file:///tmp/out-1.jpg" };
    });

    const result = await preparePhoto(asset);

    expect(mockManipulate).toHaveBeenCalledWith(asset.uri, {
      maxWidth: 1600,
      maxHeight: 1600,
    });
    expect(mockSave).toHaveBeenCalledWith({
      compress: 0.8,
      format: "jpeg",
    });
    expect(result).toEqual({
      uri: "file:///tmp/out-1.jpg",
      name: "check-in.jpg",
      type: "image/jpeg",
      file: undefined,
    });
  });

  it("recomprime até caber em 4 MB", async () => {
    mockSave
      .mockImplementationOnce(async () => {
        mockSizes.set("file:///tmp/grande.jpg", 5 * 1024 * 1024);
        return { uri: "file:///tmp/grande.jpg" };
      })
      .mockImplementationOnce(async () => {
        mockSizes.set("file:///tmp/media.jpg", 3 * 1024 * 1024);
        return { uri: "file:///tmp/media.jpg" };
      });

    const result = await preparePhoto(asset);

    expect(mockSave).toHaveBeenNthCalledWith(1, {
      compress: 0.8,
      format: "jpeg",
    });
    expect(mockSave).toHaveBeenNthCalledWith(2, {
      compress: 0.6,
      format: "jpeg",
    });
    expect(result.uri).toBe("file:///tmp/media.jpg");
  });

  it("reduz mais o lado maior quando nem a menor qualidade cabe", async () => {
    // Na escala 1 (1600 px) nenhuma qualidade cabe.
    for (const uri of ["a", "b", "c", "d"]) {
      mockSave.mockImplementationOnce(async () => {
        mockSizes.set(`file:///tmp/${uri}.jpg`, 4 * 1024 * 1024 + 1);
        return { uri: `file:///tmp/${uri}.jpg` };
      });
    }
    // Na escala 0,7 (1120 px) cabe na primeira qualidade.
    mockSave.mockImplementationOnce(async () => {
      mockSizes.set("file:///tmp/ok.jpg", 2 * 1024 * 1024);
      return { uri: "file:///tmp/ok.jpg" };
    });

    const result = await preparePhoto(asset);

    expect(mockManipulate).toHaveBeenNthCalledWith(1, asset.uri, {
      maxWidth: 1600,
      maxHeight: 1600,
    });
    expect(mockManipulate).toHaveBeenNthCalledWith(2, asset.uri, {
      maxWidth: 1120,
      maxHeight: 1120,
    });
    expect(result.uri).toBe("file:///tmp/ok.jpg");
  });

  it("recusa a foto que não cabe nem no menor tamanho", async () => {
    mockSave.mockImplementation(async () => {
      const uri = `file:///tmp/${mockSave.mock.calls.length}.jpg`;
      mockSizes.set(uri, 4 * 1024 * 1024 + 1);
      return { uri };
    });

    await expect(preparePhoto(asset)).rejects.toBeInstanceOf(
      PhotoTooLargeError,
    );
  });
});

describe("pickPhoto", () => {
  it("pede permissão da câmera e recusa quando negada", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    } as ImagePicker.MediaLibraryPermissionResponse);

    await expect(pickPhoto("camera")).rejects.toBeInstanceOf(
      PhotoPermissionError,
    );
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("devolve null quando a câmera é cancelada", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({
      granted: true,
    } as ImagePicker.MediaLibraryPermissionResponse);
    picker.launchCameraAsync.mockResolvedValueOnce({
      canceled: true,
      assets: null,
    } as unknown as ImagePicker.ImagePickerResult);

    await expect(pickPhoto("camera")).resolves.toBeNull();
  });

  it("abre a galeria sem pedir permissão de câmera", async () => {
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [asset],
    } as unknown as ImagePicker.ImagePickerResult);

    await expect(pickPhoto("library")).resolves.toBe(asset);
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      quality: 1,
    });
  });
});
