import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import type { CheckInPhotoFile } from "@/services/check-ins-api";
import { PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION } from "@/utils/photo-rules";

export type PhotoSource = "library" | "camera";

/** Foto maior que o limite mesmo depois de recomprimir. */
export class PhotoTooLargeError extends Error {
  constructor() {
    super("A foto deve ter no máximo 4 MB.");
    this.name = "PhotoTooLargeError";
  }
}

/** Sem permissão de câmera. */
export class PhotoPermissionError extends Error {
  constructor() {
    super("Permita o acesso à câmera para tirar a foto.");
    this.name = "PhotoPermissionError";
  }
}

function fileSize(uri: string): number {
  try {
    return new File(uri).size;
  } catch {
    return 0;
  }
}

/**
 * Converte para JPEG, limita o lado maior a 1600 px e recomprime até caber em
 * 4 MB. O `ImageManipulator` já aplica a orientação do EXIF ao decodificar.
 */
export async function preparePhoto(
  asset: ImagePicker.ImagePickerAsset,
): Promise<CheckInPhotoFile> {
  const scales = [1, 0.7, 0.5];
  const qualities = [0.8, 0.6, 0.4, 0.2];

  for (const scale of scales) {
    const maxSide = Math.round(PHOTO_MAX_DIMENSION * scale);
    const context = ImageManipulator.manipulate(asset.uri, {
      maxWidth: maxSide,
      maxHeight: maxSide,
    });
    const image = await context.renderAsync();

    for (const compress of qualities) {
      const result = await image.saveAsync({
        compress,
        format: SaveFormat.JPEG,
      });
      const size = fileSize(result.uri);

      if (size === 0 || size <= PHOTO_MAX_BYTES) {
        return {
          uri: result.uri,
          name: "check-in.jpg",
          type: "image/jpeg",
          // Na web o FormData precisa de um Blob/File, não de `{ uri }`.
          file:
            Platform.OS === "web"
              ? await (await fetch(result.uri)).blob()
              : undefined,
        };
      }
    }
  }

  throw new PhotoTooLargeError();
}

/** Abre a galeria ou a câmera. Devolve `null` se a pessoa cancelar. */
export async function pickPhoto(
  source: PhotoSource,
): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new PhotoPermissionError();

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    return result.canceled ? null : result.assets[0];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });
  return result.canceled ? null : result.assets[0];
}
