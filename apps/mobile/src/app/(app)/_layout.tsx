import { Tabs } from "expo-router/js-tabs";
import { theme } from "@/config/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: "#6B6560",
        tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 13 },
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hábitos" }} />
      <Tabs.Screen name="check-in" options={{ title: "Check-in" }} />
      <Tabs.Screen name="new-habit" options={{ href: null }} />
    </Tabs>
  );
}
