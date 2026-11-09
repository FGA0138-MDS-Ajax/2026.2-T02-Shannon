import { Stack } from "expo-router";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habits/create" />
      <Stack.Screen name="habits/[id]/index" />
      <Stack.Screen name="habits/[id]/edit" />
      <Stack.Screen name="habits/[id]/goal" />
      <Stack.Screen name="check-ins/create" />
      <Stack.Screen name="check-ins/[id]/index" />
      <Stack.Screen name="check-ins/[id]/edit/index" />
    </Stack>
  );
}
