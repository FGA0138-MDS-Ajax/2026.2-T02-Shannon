import { Lucide } from "@react-native-vector-icons/lucide";
import { Tabs } from "expo-router";
import { theme } from "@/config/theme";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function TabLayout() {
  const { isTablet, isDesktop } = useBreakpoint();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 13 },
        tabBarStyle: {
          backgroundColor: theme.colors.gray100,
        },
        // Celular: barra embaixo. Tablet e computador: barra lateral, com o
        // nome embaixo do ícone (tablet) ou ao lado dele (computador).
        ...(isTablet && {
          tabBarPosition: "left",
          tabBarVariant: "material",
          tabBarLabelPosition: isDesktop ? "beside-icon" : "below-icon",
          tabBarActiveBackgroundColor: theme.colors.primarySoft,
          tabBarStyle: {
            backgroundColor: theme.colors.gray100,
            borderRightColor: theme.colors.border,
            ...(isDesktop && { width: 220 }),
          },
        }),
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
        name="groups"
        options={{
          title: "Grupos",
          tabBarIcon: ({ color }) => (
            <Lucide name="users" size={20} color={color} />
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
