# Design: push-notifications

> **Plan 참조:** `docs/01-plan/features/push-notifications.plan.md`
> **작성일:** 2026-03-09

---

## 1. 변경 파일 목록

| 파일 | 변경 유형 | 항목 |
|------|---------|------|
| `src/api/notifications.ts` | 수정 | N-1: 엔드포인트·body 형식 수정 |
| `src/hooks/useNotifications.ts` | 수정 | N-2~N-6: 토큰 방식·채널·핸들러 |

---

## 2. `src/api/notifications.ts` 설계 (N-1)

### 변경 전 (현재 버그)

```ts
export async function updatePushToken(pushToken: string): Promise<PushTokenUpdateResponse> {
  const { data } = await apiClient.post<PushTokenUpdateResponse>(
    "/user/push-token",
    { pushToken }
  );
  return data;
}
```

### 변경 후

```ts
export type DeviceTokenRequest = {
  token: string;
  platform: "android" | "ios";
};

export type DeviceTokenResponse = {
  success: boolean;
};

/**
 * FCM 디바이스 토큰 등록/갱신
 * POST /users/me/device-token
 * Body: { token: string, platform: "android" | "ios" }
 */
export async function registerDeviceToken(
  token: string,
  platform: "android" | "ios"
): Promise<DeviceTokenResponse> {
  const { data } = await apiClient.post<DeviceTokenResponse>(
    "/users/me/device-token",
    { token, platform } satisfies DeviceTokenRequest
  );
  return data;
}
```

**변경 포인트:**
- 함수명: `updatePushToken` → `registerDeviceToken`
- 엔드포인트: `/user/push-token` → `/users/me/device-token`
- body: `{ pushToken }` → `{ token, platform }`
- 타입: `PushTokenUpdateResponse` 제거, `DeviceTokenResponse` 추가

---

## 3. `src/hooks/useNotifications.ts` 설계 (N-2~N-6)

### 3.1 전체 구조

```ts
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { navigationRef } from "../navigation/navigationRef";
import { registerDeviceToken } from "../api/notifications";

let Notifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;

async function loadNotificationModules(): Promise<boolean> { /* 기존 유지 */ }
```

### 3.2 Android 알림 채널 등록 (N-3)

`registerForPushNotificationsAsync` 내부 권한 요청 직전에 호출:

```ts
// Android 8.0+ 알림 채널 설정 (채널 없으면 알림 표시 안됨)
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("default", {
    name: "Connecto",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#8B5CF6",
    showBadge: true,
  });
}
```

### 3.3 FCM 디바이스 토큰 획득 (N-2)

`getExpoPushTokenAsync` → `getDevicePushTokenAsync` 로 교체:

```ts
// FCM 디바이스 토큰 (raw) — 백엔드 Firebase Admin SDK와 호환
const deviceToken = await Notifications.getDevicePushTokenAsync();
// deviceToken.data  = FCM registration token string
// deviceToken.type  = "android" | "ios"
return { token: deviceToken.data, type: deviceToken.type };
```

> `getExpoPushTokenAsync`는 Expo Push Token (`ExponentPushToken[...]`)을 반환하며 Expo 서버 경유.
> 백엔드가 Firebase Admin SDK를 직접 사용하므로 raw FCM token인 `getDevicePushTokenAsync` 필수.

### 3.4 포그라운드 알림 핸들러 (N-4)

앱이 포그라운드 상태일 때도 알림이 표시되도록:

```ts
// 앱 실행 중(포그라운드) 알림 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

> `setNotificationHandler`는 모듈 로드 직후, 구독 설정 전에 호출.

### 3.5 알림 탭 핸들러 (N-5)

사용자가 알림을 탭했을 때 FriendList 화면으로 이동:

```ts
const responseSub = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    // 알림 탭 시 FriendList로 이동 (친구 요청·통화 요청 모두 해당)
    if (navigationRef.isReady()) {
      navigationRef.navigate("MainTabs", { screen: "FriendList" } as any);
    }
  }
);
// cleanup: responseSub.remove()
```

### 3.6 토큰 갱신 감지 (N-6)

FCM 토큰이 갱신될 경우(앱 재설치 등) 자동 재등록:

```ts
const tokenSub = Notifications.addPushTokenListener(async (newToken) => {
  if (newToken.data && isMounted) {
    await registerDeviceToken(
      newToken.data,
      (newToken.type === "ios" ? "ios" : "android")
    ).catch(() => {});
  }
});
// cleanup: tokenSub.remove()
```

### 3.7 useNotifications 훅 전체 구조

```ts
export function useNotifications() {
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let responseSub: ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null = null;
    let tokenSub: ReturnType<typeof Notifications.addPushTokenListener> | null = null;

    const init = async () => {
      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;

      const loaded = await loadNotificationModules();
      if (!loaded || !Notifications || !Device) return;

      // N-4: 포그라운드 핸들러 (항상 표시)
      Notifications.setNotificationHandler({ ... });

      // N-5: 알림 탭 핸들러
      responseSub = Notifications.addNotificationResponseReceivedListener(...);

      // N-2 + N-3: 토큰 획득 (채널 + 권한 + 토큰)
      const result = await registerForPushNotificationsAsync();
      if (result && isMounted) {
        pushTokenRef.current = result.token;
        // N-1: 수정된 API 호출
        registerDeviceToken(result.token, result.type).catch(() => {});
      }

      // N-6: 토큰 갱신 감지
      tokenSub = Notifications.addPushTokenListener(...);
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
```

### 3.8 `registerForPushNotificationsAsync` 변경

```ts
// 반환 타입 변경: string | null → { token: string; type: "android" | "ios" } | null
async function registerForPushNotificationsAsync(): Promise<{
  token: string;
  type: "android" | "ios";
} | null> {
  if (!Notifications || !Device) return null;
  try {
    if (!Device.isDevice) return null;

    // N-3: Android 알림 채널
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Connecto",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8B5CF6",
        showBadge: true,
      });
    }

    // 권한 요청
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;

    // N-2: FCM 디바이스 토큰 (raw) 획득
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    return {
      token: deviceToken.data as string,
      type: deviceToken.type === "ios" ? "ios" : "android",
    };
  } catch {
    return null;
  }
}
```

---

## 4. 구현 순서

```
1. src/api/notifications.ts          — registerDeviceToken() 수정 (N-1)
2. src/hooks/useNotifications.ts     — 전체 수정 (N-2~N-6)
```

App.tsx는 변경 없음 (`useNotifications()` 이미 호출 중).

---

## 5. 검증 항목

| 번호 | 항목 | 확인 방법 |
|------|------|---------|
| V-1 | 앱 실행 시 `POST /users/me/device-token` 호출 성공 | 백엔드 로그 확인 |
| V-2 | request body `{ token: "...", platform: "android" }` | 네트워크 탭 |
| V-3 | 포그라운드에서 FCM 수신 시 알림 표시 | Firebase console 테스트 메시지 |
| V-4 | 알림 탭 시 FriendList 화면으로 이동 | 수동 테스트 |
| V-5 | Android 채널 생성 확인 | 기기 설정 → 앱 알림 |

---

## 6. 의존성 / 환경 변수

**추가 패키지:** 없음 (`expo-notifications`, `expo-device` 이미 설치)

**제거 가능 환경 변수:** `EXPO_PUBLIC_PROJECT_ID` — `getDevicePushTokenAsync()` 전환 후 불필요

**필수 환경 (백엔드):** `FIREBASE_SERVICE_ACCOUNT_JSON` — 로컬 개발 시 없어도 무방 (FcmConfig nullable)

---

> **다음 단계:** `/pdca do push-notifications` 또는 바로 구현 시작
