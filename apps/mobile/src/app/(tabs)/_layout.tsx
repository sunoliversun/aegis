import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0d1117",
          borderTopColor: "#1f2937",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#3b6bfa",
        tabBarInactiveTintColor: "#6b7280",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <Ionicons name="warning" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="identity"
        options={{
          title: "Identity",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: "Devices",
          tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insurance"
        options={{
          title: "Insurance",
          tabBarIcon: ({ color, size }) => <Ionicons name="umbrella" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
