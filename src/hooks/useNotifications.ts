import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { navigationRef } from "../navigation/navigationRef";
import { registerDeviceToken } from "../api/notifications";
import { getMatchStatus } from "../api/match";

let Notifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;

async function loadNotificationModules(): Promise<boolean> {
  if (!Notifications) {
    try {
      Notifications = await import("expo-notifications");
      Device = await import("expo-device");
    } catch { return false; }
  }
  return true;
}

export function useNotifications() {
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let responseSub: { remove: () => void } | null = null;
    let tokenSub: { remove: () => void } | null = null;

    const init = async () => {
      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;

      const loaded = await loadNotificationModules();
      if (!loaded || !Notifications || !Device) return;

      // N-4: 포그라운드 알림 핸들러 — 앱 실행 중에도 알림 표시
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // N-5: 알림 탭 핸들러 — 알림 종류에 따라 화면 라우팅
      responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
        if (!navigationRef.isReady()) return;
        const data = response.notification.request.content.data as Record<string, unknown>;

        // "통화 요청" FCM (call:incoming) → IN_PROGRESS 세션 조회 후 CallScreen 진입
        if (data?.type === "call_incoming") {
          try {
            const status = await getMatchStatus();
            if (status.status === "IN_PROGRESS" && status.sessionId && status.webrtcChannelId) {
              (navigationRef as any).current?.navigate("Call", {
                sessionId: status.sessionId,
                webrtcChannelId: status.webrtcChannelId,
                isOfferer: false,
              });
              return;
            }
          } catch {
            // 세션 조회 실패 시 FriendList로 fallback
          }
          navigationRef.navigate("MainTabs", { screen: "FriendList" } as never);
          return;
        }

        // "다시 통화 요청" FCM → CallScreen으로 딥링크 (FCM data payload는 모두 string)
        if (data?.type === "call_rematch" && typeof data?.sessionId === "string") {
          const sessionId = parseInt(data.sessionId as string, 10);
          const webrtcChannelId = data.webrtcChannelId as string;
          const isOfferer = (data.isOfferer as string) === "true";
          if (!isNaN(sessionId) && webrtcChannelId) {
            (navigationRef as any).current?.navigate("Call", {
              sessionId,
              webrtcChannelId,
              isOfferer,
            });
            return;
          }
        }

        // 기본: FriendList로 이동
        navigationRef.navigate("MainTabs", { screen: "FriendList" } as never);
      });

      // N-2 + N-3: FCM 디바이스 토큰 획득 (채널 설정 포함)
      const result = await registerForPushNotificationsAsync();
      if (result && isMounted) {
        pushTokenRef.current = result.token;
        // N-1: 수정된 엔드포인트·body로 등록
        registerDeviceToken(result.token, result.platform).catch(() => {});
      }

      // N-6: FCM 토큰 갱신 감지 (앱 재설치 등)
      tokenSub = Notifications.addPushTokenListener(async (newToken) => {
        if (newToken.data && isMounted) {
          const platform = newToken.type === "ios" ? "ios" : "android";
          registerDeviceToken(newToken.data as string, platform).catch(() => {});
        }
      });
    };

    const t = setTimeout(init, 200);

    return () => {
      isMounted = false;
      clearTimeout(t);
      responseSub?.remove();
      tokenSub?.remove();
    };
  }, []);

  return { pushToken: pushTokenRef.current };
}

// N-2 + N-3: FCM raw 디바이스 토큰 획득
async function registerForPushNotificationsAsync(): Promise<{
  token: string;
  platform: "android" | "ios";
} | null> {
  if (!Notifications || !Device) return null;
  try {
    if (!Device.isDevice) return null;

    // N-3: Android 8.0+ 알림 채널 (없으면 알림 미표시)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Connecto",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8B5CF6",
        showBadge: true,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;

    // N-2: Expo Push Token 대신 FCM 디바이스 토큰 (raw) 사용
    // 백엔드 Firebase Admin SDK와 직접 호환
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    return {
      token: deviceToken.data as string,
      platform: deviceToken.type === "ios" ? "ios" : "android",
    };
  } catch (e) {
    if (__DEV__) console.warn("Push token registration error:", e);
    return null;
  }
}
