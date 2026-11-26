import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { colors, fonts } from "@/src/theme";

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dziś",
          tabBarIcon: ({ color }) => (
            <TabIcon name="sun-o" color={typeof color === "string" ? color : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="fitness"
        options={{
          title: "Forma",
          tabBarIcon: ({ color }) => (
            <TabIcon name="heartbeat" color={typeof color === "string" ? color : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="runs"
        options={{
          title: "Biegi",
          tabBarIcon: ({ color }) => (
            <TabIcon name="list" color={typeof color === "string" ? color : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Statystyki",
          tabBarIcon: ({ color }) => (
            <TabIcon name="bar-chart" color={typeof color === "string" ? color : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ustawienia",
          tabBarIcon: ({ color }) => (
            <TabIcon name="cog" color={typeof color === "string" ? color : colors.muted} />
          ),
        }}
      />
    </Tabs>
  );
}
