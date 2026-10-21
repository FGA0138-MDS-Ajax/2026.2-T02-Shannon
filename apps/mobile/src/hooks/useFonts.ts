import {
  LibreBaskerville_400Regular,
  LibreBaskerville_500Medium,
  LibreBaskerville_600SemiBold,
  LibreBaskerville_700Bold,
  useFonts as useExpoFonts,
} from "@expo-google-fonts/libre-baskerville";

export default function useFonts() {
  const [fontsLoaded] = useExpoFonts({
    LibreBaskerville_400Regular,
    LibreBaskerville_500Medium,
    LibreBaskerville_600SemiBold,
    LibreBaskerville_700Bold,
  });

  return fontsLoaded;
}
