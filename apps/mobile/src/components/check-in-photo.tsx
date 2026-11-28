import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import type { CheckInPhotoPublic } from "@/services/types/habits";
import { photoCacheKey } from "@/utils/photo-rules";

export interface CheckInPhotoProps {
  checkInId: string;
  photo: CheckInPhotoPublic;
  /** `full` usa `photo.url`; listas e feed usam só a miniatura. */
  variant?: "full" | "thumbnail";
  onError?: () => void;
  testID?: string;
}

/**
 * Foto do check-in com o `expo-image`. A `cacheKey` é estável (id + caminho
 * sem query), então a troca da URL assinada não invalida o cache.
 */
export function CheckInPhoto({
  checkInId,
  photo,
  variant = "thumbnail",
  onError,
  testID,
}: CheckInPhotoProps) {
  const uri =
    variant === "full"
      ? (photo.url ?? photo.thumbnail_url)
      : photo.thumbnail_url;

  return (
    <Image
      testID={testID ?? `check-in-photo-${checkInId}`}
      source={{ uri, cacheKey: photoCacheKey(checkInId, uri) }}
      style={variant === "full" ? styles.full : styles.thumbnail}
      contentFit="cover"
      transition={150}
      onError={onError}
      accessibilityLabel="Foto do check-in"
    />
  );
}

const styles = StyleSheet.create({
  full: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: "#E7E2DE",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E7E2DE",
  },
});
