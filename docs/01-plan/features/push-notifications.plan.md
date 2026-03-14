# Plan: push-notifications

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 백엔드 FCM이 완성됐으나 프론트엔드 알림 통합이 미완성 — 엔드포인트·토큰 타입 불일치로 토큰 등록이 실패하고, 알림 수신 핸들러가 없어 실제 알림이 동작하지 않음 |
| **Solution** | API 엔드포인트·요청 형식 수정, FCM 디바이스 토큰 방식으로 전환, 포그라운드 알림 핸들러 및 알림 탭 내비게이션 구현 |
| **Function UX Effect** | 친구 요청·통화 요청 수신 시 푸시 알림이 표시되고, 알림 탭 시 관련 화면(친구 목록)으로 자동 이동 |
| **Core Value** | 앱을 열지 않아도 상대방의 친구·통화 요청을 즉시 인지할 수 있어 재방문율 향상 |

---

## 1. 기능 정의

### 1.1 개요

Connecto의 푸시 알림 기능. 백엔드는 Firebase Admin SDK 기반 FCM을 이미 구현 완료(2026-03-09). 프론트엔드는 `useNotifications.ts`와 `src/api/notifications.ts` 뼈대가 있으나 **엔드포인트·토큰 타입·핸들러** 모두 미완성 상태로 실제 동작하지 않음.

### 1.2 현재 구현 vs 필요 상태

| 항목 | 현재 (버그) | 목표 |
|------|------------|------|
| API 엔드포인트 | `POST /user/push-token` | `POST /users/me/device-token` |
| 요청 body | `{ pushToken: string }` | `{ token: string, platform: "android"\|"ios" }` |
| 토큰 타입 | Expo Push Token (`ExponentPushToken[...]`) | FCM 디바이스 토큰 (raw) |
| 토큰 획득 방법 | `Notifications.getExpoPushTokenAsync()` | `Notifications.getDevicePushTokenAsync()` |
| 포그라운드 핸들러 | 없음 | `setNotificationHandler` 등록 |
| 알림 탭 핸들러 | 없음 | `addNotificationResponseReceivedListener` |
| Android 채널 | 없음 | `setNotificationChannelAsync` |

### 1.3 트리거 시나리오

백엔드가 FCM을 전송하는 3가지 케이스:
1. **친구 요청 수신** — `FriendService.sendFriendRequest()` 이후
2. **친구 요청 수락** — `FriendService.acceptFriendRequest()` 이후
3. **친구 통화 요청** — `CallService.requestCallToFriend()` 이후

---

## 2. 기술 스펙

### 2.1 백엔드 API (이미 완료)

```
POST /users/me/device-token   Authorization: Bearer <token>
Body: { "token": "<fcm_device_token>", "platform": "android" | "ios" }

DELETE /users/me/device-token  Authorization: Bearer <token>
(로그아웃 시 자동 호출 — AuthController.logout()에서 처리됨)
```

### 2.2 FCM 디바이스 토큰 획득

`expo-notifications`의 `getDevicePushTokenAsync()`는 추가 패키지 없이 raw FCM 토큰 반환:

```ts
const deviceToken = await Notifications.getDevicePushTokenAsync();
// deviceToken.data = FCM registration token (Android: string, iOS: string)
// deviceToken.type = "android" | "ios"
```

> Expo Push Token(`getExpoPushTokenAsync`)은 Expo 서버를 경유하므로, Firebase Admin SDK 직접 연동 백엔드에서는 불가. `getDevicePushTokenAsync()` 사용 필수.

### 2.3 Android 알림 채널 (필수)

Android 8.0+ 에서 채널 없이 알림 표시 불가:

```ts
await Notifications.setNotificationChannelAsync("default", {
  name: "default",
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
});
```

### 2.4 환경 변수

`EXPO_PUBLIC_PROJECT_ID`는 `getExpoPushTokenAsync()`에서만 필요 → `getDevicePushTokenAsync()` 로 전환 시 불필요.

---

## 3. 구현 범위 (Scope)

### In Scope

| 번호 | 항목 | 파일 |
|------|------|------|
| N-1 | API 함수 수정 — 엔드포인트·body 형식 수정 | `src/api/notifications.ts` |
| N-2 | FCM 토큰 획득 방식 변경 — `getDevicePushTokenAsync()` | `src/hooks/useNotifications.ts` |
| N-3 | Android 알림 채널 등록 | `src/hooks/useNotifications.ts` |
| N-4 | 포그라운드 알림 핸들러 등록 — 앱 실행 중 알림 표시 | `src/hooks/useNotifications.ts` |
| N-5 | 알림 탭 핸들러 — 탭 시 FriendList 화면으로 이동 | `src/hooks/useNotifications.ts` |
| N-6 | 토큰 갱신 감지 — `addPushTokenListener` | `src/hooks/useNotifications.ts` |

### Out of Scope

- iOS APNS 설정 (개발 단계에서는 Android 우선)
- 알림 타입별 세분화 화면 이동 (친구 요청 vs 통화 요청)
- 알림 내역 저장·조회 UI
- 백엔드 `DELETE /users/me/device-token` 명시적 호출 — 백엔드 logout에서 자동 처리됨

---

## 4. 구현 순서

```
1. src/api/notifications.ts         — API 수정 (N-1)
2. src/hooks/useNotifications.ts    — 토큰 획득 + 채널 + 핸들러 (N-2 ~ N-6)
3. App.tsx                          — navigationRef 전달 확인 (이미 통합됨)
```

---

## 5. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 앱 최초 실행 | 권한 요청 → 허용 → 토큰 `POST /users/me/device-token` 성공 |
| 백그라운드에서 친구 요청 수신 | 상단 알림 표시 |
| 포그라운드에서 친구 요청 수신 | 앱 내 알림 표시 |
| 알림 탭 | FriendListScreen으로 이동 |

---

## 6. 의존성

- `expo-notifications` — 이미 설치됨 (useNotifications.ts에서 사용 중)
- `expo-device` — 이미 설치됨
- 백엔드 FCM — ✅ 완료 (2026-03-09)
- `navigationRef` — ✅ App.tsx에 이미 통합됨

---

> **작성일:** 2026-03-09
> **작성자:** PM (bkit PDCA Plan)
> **다음 단계:** `/pdca design push-notifications`
