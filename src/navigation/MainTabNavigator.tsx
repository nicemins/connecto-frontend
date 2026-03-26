import * as React from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import type { MainTabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import FriendListScreen from "../screens/FriendListScreen";
import ChatListScreen from "../screens/ChatListScreen";
import MyPageScreen from "../screens/MyPageScreen";
import { getFriendRequests } from "../api/friends";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const [friendRequestCount, setFriendRequestCount] = React.useState(0);

  // 친구 요청 뱃지 — 탭 포커스 시 갱신
  const refreshBadge = React.useCallback(async () => {
    try {
      const requests = await getFriendRequests();
      setFriendRequestCount(requests.filter((r) => r.status === "PENDING").length);
    } catch {
      // 무시
    }
  }, []);

  React.useEffect(() => {
    refreshBadge();
  }, [refreshBadge]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarStyle: {
          backgroundColor: "#10101E",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="🏠" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="FriendList"
        component={FriendListScreen}
        listeners={{ focus: refreshBadge }}
        options={{
          tabBarLabel: "친구",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="👥" color={color} focused={focused} badge={friendRequestCount} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          tabBarLabel: "채팅",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="💬" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{
          tabBarLabel: "내 정보",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="👤" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({
  emoji,
  color,
  focused,
  badge = 0,
}: {
  emoji: string;
  color: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
      {badge > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -8,
            backgroundColor: "#EF4444",
            borderRadius: 8,
            minWidth: 16,
            height: 16,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}
