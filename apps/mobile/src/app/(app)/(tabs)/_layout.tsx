import { Lucide } from "@react-native-vector-icons/lucide";
import { Tabs } from "expo-router";
import { theme } from "@/config/theme";

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: "#6B6560",
        tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 13 },
        tabBarStyle: {
          backgroundColor: theme.colors.gray100,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Painel",
          tabBarIcon: ({ color }) => (
            <Lucide name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Hábitos",
          tabBarIcon: ({ color }) => (
            <Lucide name="rabbit" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => (
            <Lucide name="book-open-check" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title: "Usuário",
          tabBarIcon: ({ color }) => (
            <Lucide name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
