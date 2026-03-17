import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { useNotifications } from "./src/hooks/useNotifications";
import { useIncomingCall } from "./src/hooks/useIncomingCall";
import IncomingCallModal from "./src/components/IncomingCallModal";
import { useAuthStore } from "./src/store/authStore";
import { getMe } from "./src/api/auth";
import { navigationRef } from "./src/navigation/navigationRef";
import { CommonActions } from "@react-navigation/native";

export default function App() {
  useNotifications();
  const { incomingCall, dismiss } = useIncomingCall();
  const { loadTokens, setMe, persistTokens, logout } = useAuthStore();
  const [isHydrating, setIsHydrating] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await loadTokens();
        if (accessToken) {
          try {
            const me = await getMe();
            setMe(me);
            // 토큰 유효 → 네비게이터가 마운트된 후 라우팅
            setTimeout(() => {
              if (navigationRef.isReady()) {
                const route = !me.profile ? "ProfileSetup" : "MainTabs";
                navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: route }] }));
              }
            }, 0);
          } catch {
            // 토큰 만료 또는 검증 실패 → 로그아웃 처리
            await logout();
          }
        }
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
      <IncomingCallModal incomingCall={incomingCall} onDismiss={dismiss} />
    </>
  );
}
