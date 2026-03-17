import * as React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import FriendListScreen from "../screens/FriendListScreen";
import MyPageScreen from "../screens/MyPageScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderTopWidth: 1,
          borderTopColor: "rgba(0, 0, 0, 0.1)",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "홈",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FriendList"
        component={FriendListScreen}
        options={{
          tabBarLabel: "친구",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="users" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{
          tabBarLabel: "내 정보",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// 간단한 탭 아이콘 컴포넌트 (이모지 기반)
function TabIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  const icons: Record<string, string> = {
    home: "🏠",
    users: "👥",
    user: "👤",
  };
  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name] || "•"}
    </Text>
  );
}
