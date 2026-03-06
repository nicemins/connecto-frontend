# CLAUDE.md — Connecto 프론트엔드

> **프론트엔드 전용** AI 개발 컨텍스트 파일입니다.
>
> - 백엔드 CLAUDE.md: `C:\Users\PM\OneDrive\Desktop\PM\connecto\CLAUDE.md`
> - 원본 스펙 시트: https://docs.google.com/spreadsheets/d/1lawKmS9PrXNMYv2US2IXgCX-SejIFrBuvuZI9DfssRU

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Connecto |
| 설명 | 5분 익명 보이스 채팅 기반 실시간 매칭 및 언어 교환 플랫폼 |
| 슬로건 | "지금, 누군가와 5분만 이야기해요." |
| 레포 경로 | `C:\connecto-app` |
| 백엔드 경로 | `C:\Users\PM\OneDrive\Desktop\PM\connecto` |

---

## 2. 프론트엔드 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| Framework | React Native + Expo | 0.81.5 / ~54 |
| Language | TypeScript | ~5.9 |
| Styling | NativeWind (TailwindCSS) | v2 / 3.3.2 |
| State | Zustand | v5 |
| HTTP | Axios | v1 |
| Realtime | Socket.IO Client | v4 |
| Audio/Video | react-native-webrtc | v124 |
| Animation | Moti + Reanimated | v4 |
| Navigation | React Navigation | v7 |
| Token 저장 | expo-secure-store | - |

---

## 3. 환경 변수 (`.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_SOCKET_URL=http://localhost:9092

# WebRTC TURN 서버 (선택 - 미설정 시 STUN only)
EXPO_PUBLIC_TURN_URL=
EXPO_PUBLIC_TURN_USERNAME=
EXPO_PUBLIC_TURN_CREDENTIAL=
```

> - REST API: 포트 **8080** (`/auth/...`, `/users/...`, `/match/...`, `/call/...`)
> - Socket.IO: 포트 **9092** (별도 서버)
> - API prefix 없음 (`/api/v1` X)

---

## 4. 프론트엔드 아키텍처

### 4.1 파일 구조

```
connecto-app/
├── App.tsx                    # 앱 진입점 — 토큰 복원 + hydration
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios 인스턴스 + 401 interceptor (자동 갱신)
│   │   ├── auth.ts            # signup, login, refresh, logout, deleteAccount, getMe, checkEmailAvailable
│   │   ├── profile.ts         # createProfile, updateProfile, updateProfileImage, getMyProfile, checkNicknameAvailable
│   │   ├── languages.ts       # saveLanguage, getInterests, saveInterests
│   │   ├── match.ts           # getMatchResult
│   │   ├── call.ts            # endCall, callAgain
│   │   ├── socket.ts          # Socket.IO 싱글톤 (connectSocket, getSocket, disconnectSocket)
│   │   ├── friends.ts         # getFriendList, getFriendRequests, requestFriend, acceptFriendRequest, rejectFriendRequest, requestCallToFriend
│   │   ├── report.ts          # reportUser
│   │   └── notifications.ts   # 푸시 알림 설정
│   ├── store/
│   │   └── authStore.ts       # Zustand: accessToken, refreshToken, me
│   │                          # persistTokens, loadTokens, logout (모두 async)
│   ├── hooks/
│   │   ├── useSocketMatching.ts  # 매칭 + polling fallback + isOfferer 판단
│   │   ├── useWebRTC.ts          # WebRTC offer/answer/ICE + TURN 설정
│   │   └── useNotifications.ts   # Expo 푸시 알림
│   ├── screens/
│   │   ├── LoginScreen.tsx          # 로그인 + 프로필 체크 라우팅
│   │   ├── SignUpScreen.tsx
│   │   ├── ProfileSetupScreen.tsx   # 닉네임 중복 확인 + createProfile
│   │   ├── LanguageSetupScreen.tsx  # 언어 설정 → InterestsSetup 이동
│   │   ├── InterestsSetupScreen.tsx # 관심사 — 마운트 시 기존 관심사 로드 + 실 저장
│   │   ├── HomeScreen.tsx           # 매칭 시작 화면
│   │   ├── MatchingScreen.tsx       # 매칭 대기 화면
│   │   ├── CallScreen.tsx           # 통화 화면 (WebRTC)
│   │   ├── MatchResultScreen.tsx    # 통화 결과 + 친구 신청
│   │   ├── FriendListScreen.tsx     # 친구 목록 + 친구 요청 수락/거절
│   │   └── MyPageScreen.tsx         # 마이페이지
│   └── navigation/
│       ├── RootNavigator.tsx        # Stack navigator
│       ├── MainTabNavigator.tsx     # Bottom tabs
│       ├── navigationRef.ts         # 전역 ref (App.tsx에서 토큰 복원 후 라우팅)
│       └── types.ts                 # RootStackParamList
└── app.json
```

### 4.2 네비게이션 트리

```
Stack (RootNavigator) — initialRoute: "Login"
├── Login
├── SignUp
├── ProfileSetup
├── LanguageSetup
├── InterestsSetup
├── MainTabs (Bottom Tab)
│   ├── Home
│   ├── FriendList
│   └── MyPage
├── Matching
├── Call         { sessionId: number, webrtcChannelId: string, isOfferer: boolean }
└── MatchResult  { sessionId: number, partnerId?: string, totalTime: string }
```

**온보딩 플로우:**
```
[신규 유저] SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
[기존 유저] 앱 실행 → loadTokens() → getMe() → MainTabs (또는 ProfileSetup)
[토큰 만료] 앱 실행 → loadTokens() → getMe() 실패 → Login
```

### 4.3 인증 / 토큰 관리

```
로그인
  POST /auth/login
  → accessToken (body) → Zustand + SecureStore
  → refreshToken (Set-Cookie 헤더 수동 추출) → Zustand + SecureStore

요청
  → Axios interceptor → Authorization: Bearer <accessToken>
  → withCredentials 사용 안 함 (refreshToken 수동 관리)

401 처리
  → POST /auth/refresh (Cookie: refreshToken=...)
  → 새 accessToken 발급 → 원래 요청 재시도
  → 대기 요청들은 queue에서 일괄 처리
  → refresh 실패 → logout() → Login 화면

앱 시작 (App.tsx)
  → loadTokens() (SecureStore 복원)
  → accessToken 있으면 getMe() 호출
  → me.profile 없으면 ProfileSetup, 있으면 MainTabs
  → isHydrating 동안 ActivityIndicator 표시
```

---

## 5. 개발 규칙

### 커밋 타입
| Type | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `ui` | UI 디자인/스타일 작업 |
| `fix` | 버그 수정 |
| `chore` | 빌드, 패키지 설정 |
| `refactor` | 코드 리팩토링 |

### API 작성 규칙
- 모든 API 함수는 `src/api/` 하위 도메인별 파일로 분리
- 함수 위 JSDoc에 HTTP 메서드 + 엔드포인트 명시
- `response.data.data`로 실제 데이터 추출 (공통 래퍼 unwrap)
- 인증 요청은 Axios interceptor가 자동으로 Bearer 토큰 주입
- 백엔드 미구현 API는 try/catch로 fallback 처리 (앱 크래시 방지)

### 스타일링
- NativeWind `className` prop 우선 사용
- 동적 값이 필요한 경우만 `StyleSheet.create` 혼용

### 타입 규칙
- `sessionId` 는 항상 `number` (string 사용 금지)
- `MatchResultData` = `{ profile: { id, nickname, profileImageUrl?, bio? }, wantAgain: boolean }`

---

## 6. 백엔드 API 참조

> 백엔드 상세 명세: `C:\Users\PM\OneDrive\Desktop\PM\connecto\CLAUDE.md` 참조
>
> 공통 응답 형식: `{ success: boolean, data: T, message?: string }`

### 6.1 인증 (`/auth`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/auth/signup` | 회원가입 | ✅ |
| POST | `/auth/login` | 로그인 → accessToken(body) + refreshToken(Set-Cookie) | ✅ |
| POST | `/auth/refresh` | 토큰 갱신 (Cookie 기반) | ✅ |
| POST | `/auth/logout` | 로그아웃 | ✅ |

### 6.2 사용자 (`/users`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| GET | `/users/me` | user + profile + languages 통합 조회 | ✅ |
| PUT | `/users/me` | 비밀번호 수정 | ✅ |
| DELETE | `/users/me` | 회원 탈퇴 (soft delete) | ✅ |
| GET | `/users/exists/email?email=` | 이메일 중복 확인 | ✅ |

**GET /users/me 응답:**
```typescript
{
  user: { id: number, email: string, createdAt: string },
  profile: { id: number, nickname: string, profileImageUrl?: string, bio?: string } | null,
  languages: Array<{ id: number, languageCode: string, type: "NATIVE"|"LEARNING", level: "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"NATIVE" }>
}
```

### 6.3 프로필

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/users/me/profile` | 프로필 최초 생성 (신규 유저 전용) | ✅ |
| GET | `/users/me/profile` | 내 프로필 조회 | ✅ |
| PATCH | `/users/me/profile` | 프로필 수정 | ✅ |
| PATCH | `/users/me/profile/image` | 이미지 수정 (multipart/form-data, part: "image", 허용: jpeg/png/webp, S3 저장) | ✅ |
| GET | `/profiles/exists?nickname=` | 닉네임 중복 확인 | ✅ |

### 6.4 언어 / 관심사

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/users/me/languages` | 언어 추가 | ✅ |
| GET | `/users/me/languages` | 언어 목록 조회 | ✅ |
| PUT | `/users/me/languages` | 언어 전체 교체 | ✅ |
| DELETE | `/users/me/languages/{id}` | 언어 삭제 | ✅ |
| POST | `/users/me/interests` | 관심사 저장 | ✅ 2026-03-06 |
| GET | `/users/me/interests` | 관심사 조회 | ✅ 2026-03-06 |
| DELETE | `/users/me/interests` | 관심사 삭제 | ✅ 2026-03-06 |

### 6.5 매칭 (`/match`) — Redis 필요

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/match/start` | 대기열 진입 | ✅ |
| POST | `/match/cancel` | 대기 취소 | ✅ |
| GET | `/match/status` | 현재 매칭 상태 | ✅ |
| GET | `/match/result/{sessionId}` | 통화 종료 후 상대 프로필 | ✅ |

**GET /match/result/{sessionId} 응답:**
```typescript
{ profile: { id: number, nickname: string, profileImageUrl?: string, bio?: string }, wantAgain: boolean }
```

### 6.6 통화 (`/call`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/call/end` | 통화 종료 `{ sessionId }` | ✅ |
| POST | `/call/again` | 재연결 의사 `{ sessionId, wantAgain }` | ✅ |

### 6.7 친구 / 신고

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| GET | `/friends` | 친구 목록 | ✅ 2026-03-06 |
| GET | `/friends/requests` | 받은 친구 요청 목록 | ✅ 2026-03-06 |
| POST | `/friends/request` | 친구 신청 | ✅ 2026-03-06 |
| PATCH | `/friends/request/{id}/accept` | 친구 요청 수락 | ✅ 2026-03-06 |
| PATCH | `/friends/request/{id}/reject` | 친구 요청 거절 | ✅ 2026-03-06 |
| POST | `/call/request/{friendId}` | 친구에게 통화 요청 | ✅ 2026-03-06 |
| POST | `/reports` | 신고 `{ sessionId, reportedUserId, reason? }` | ✅ 2026-03-06 |

---

## 7. Socket.IO 이벤트 참조

- **연결:** `EXPO_PUBLIC_SOCKET_URL` (기본 `http://localhost:9092`)
- **인증:** `{ auth: { token: accessToken }, query: { token: accessToken } }`
- **transport:** `["websocket", "polling"]`, 재연결 최대 5회

| 방향 | 이벤트 | 페이로드 | BE 상태 |
|------|--------|---------|---------|
| emit | `match:start` | - | ✅ |
| emit | `match:cancel` | - | ✅ |
| on | `match:success` | `{ sessionId: number, webrtcChannelId: string, isOfferer: boolean }` | ✅ |
| on | `match:error` | `{ code: string, message: string }` | ✅ |
| on | `match:cancelled` | `{ success: true }` | ✅ |
| emit | `webrtc:join` | `{ channelId, sessionId }` | ✅ |
| emit | `webrtc:offer` | `{ channelId, sdp }` | ✅ |
| emit | `webrtc:answer` | `{ channelId, sdp }` | ✅ |
| emit | `webrtc:ice` | `{ channelId, candidate }` | ✅ |
| on | `webrtc:offer` | - | ✅ (릴레이) |
| on | `webrtc:answer` | - | ✅ (릴레이) |
| on | `webrtc:ice` | - | ✅ (릴레이) |
| on | `friend:status-change` | `{ friendId, isOnline: boolean }` | ❌ 백엔드 미구현 |

---

## 8. 핵심 비즈니스 로직

1. **온보딩:** SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs (신규 유저) / 토큰 복원 → MainTabs (기존 유저)
2. **매칭:** `POST /match/start` + `socket.emit("match:start")` → `match:success { sessionId, webrtcChannelId, isOfferer }` → CallScreen
3. **WebRTC 통화:** `webrtc:join` → isOfferer가 offer 생성 → ICE 교환 → 5분 통화 → `POST /call/end` → MatchResultScreen
4. **통화 결과:** 상대 프로필 조회 / 친구 신청(`POST /friends/request`) / 재연결(`POST /call/again`)
5. **친구 관리:** 친구 목록(`GET /friends`) / 요청 수락·거절(`PATCH /friends/request/{id}/accept|reject`) / 친구 통화(`POST /call/request/{friendId}`)

---

## 9. 구현 현황 (항상 최신 유지)

> **마지막 업데이트:** 2026-03-06
> 기능 개발 완료 시 이 섹션을 반드시 업데이트할 것.

### 프론트엔드 완료 ✅

| 기능 | 주요 파일 | 비고 |
|------|----------|------|
| 회원가입 | `SignUpScreen.tsx`, `auth.ts` | 이메일 중복 확인 포함 |
| 로그인 | `LoginScreen.tsx` | `!me.profile` 체크 → ProfileSetup or MainTabs |
| 프로필 설정 | `ProfileSetupScreen.tsx` | 닉네임 중복 확인 + `createProfile` |
| 언어 설정 | `LanguageSetupScreen.tsx` | `saveLanguage()` → InterestsSetup 이동 |
| 관심사 설정 | `InterestsSetupScreen.tsx`, `languages.ts` | `getInterests()` 로드 + 실 저장 |
| 토큰 영속화 | `authStore.ts` | SecureStore, `persistTokens` / `loadTokens` / `logout` |
| 앱 시작 라우팅 | `App.tsx` | `isHydrating` → 토큰 복원 → `getMe` → 라우팅 |
| 매칭 | `MatchingScreen.tsx`, `useSocketMatching.ts` | Socket + REST polling fallback |
| WebRTC 통화 | `CallScreen.tsx`, `useWebRTC.ts` | `isOfferer` 서버 수신, TURN 설정, 30초 잠금, 재연결 |
| 통화 결과 | `MatchResultScreen.tsx` | 상대 프로필, 친구 신청, 재연결, 신고 |
| 친구 목록 | `FriendListScreen.tsx`, `friends.ts` | 실 API, 친구 요청 수락/거절, FriendDetail 모달 |
| 마이페이지 | `MyPageScreen.tsx` | 프로필 조회·수정, 이미지 업로드(S3), 로그아웃, 회원 탈퇴 |

### 프론트엔드 미구현 / 개발 필요 🔧

| 기능 | 우선순위 | BE 의존성 | 설명 |
|------|----------|----------|------|
| 언어 설정 편집 (MyPage) | 낮음 | ✅ | 현재 언어 표시만 됨, 수정 UI 없음 |
| 푸시 알림 | 낮음 | ❌ | `useNotifications.ts` 준비됨 |

### 백엔드 미구현 — 프론트 대응 현황 ⏳

| 백엔드 항목 | 프론트 대응 |
|-----------|------------|
| `friend:status-change` 소켓 | `socket.on` 리스너 등록 완료, 백엔드 emit 구현 후 즉시 동작 |
