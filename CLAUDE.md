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
| 로컬 저장소 | @react-native-async-storage/async-storage | - |

---

## 3. 환경 변수 (`.env`)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080        # 에뮬레이터용 (실기기: PC LAN IP)
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092

# Google OAuth 2.0 Client IDs
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web_client_id>.apps.googleusercontent.com

# WebRTC TURN 서버 (선택 - 미설정 시 STUN only)
EXPO_PUBLIC_TURN_URL=
EXPO_PUBLIC_TURN_USERNAME=
EXPO_PUBLIC_TURN_CREDENTIAL=
```

> - 실기기 테스트 시: `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080`
> - 에뮬레이터: `10.0.2.2` (Android emulator host alias)

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
│   │   ├── auth.ts            # signup, login, loginWithSocial, refresh, logout, deleteAccount, getMe, checkEmailAvailable
│   │   ├── profile.ts         # createProfile, updateProfile, updateProfileImage, getMyProfile, checkNicknameAvailable
│   │   ├── languages.ts       # saveLanguage, getLanguages, updateLanguages, deleteLanguage, getInterests, saveInterests
│   │   ├── match.ts           # getMatchResult
│   │   ├── call.ts            # endCall, callAgain
│   │   ├── socket.ts          # Socket.IO 싱글톤 (connectSocket, getSocket, disconnectSocket)
│   │   ├── friends.ts         # getFriendList, getFriendRequests, requestFriend, acceptFriendRequest, rejectFriendRequest, requestCallToFriend
│   │   ├── report.ts          # reportUser
│   │   ├── notifications.ts   # 푸시 알림 설정
│   │   └── webrtc.ts          # getTurnCredentials → GET /webrtc/turn-credentials (SEC-H1)
│   ├── store/
│   │   └── authStore.ts       # Zustand: accessToken, refreshToken, me
│   │                          # persistTokens, loadTokens, logout (모두 async)
│   ├── components/
│   │   ├── CharacterBlob.tsx     # 공통 캐릭터 blob (size, colors props) — 4개 화면에서 재사용
│   │   └── IncomingCallModal.tsx # 친구 통화 요청 수락/거절 전역 팝업 (App.tsx에서 렌더링)
│   ├── hooks/
│   │   ├── useSocketMatching.ts  # 매칭 + polling fallback + isOfferer 판단
│   │   ├── useWebRTC.ts          # WebRTC offer/answer/ICE + TURN 설정 (wasConnectedRef ICE 버그 수정)
│   │   ├── useIncomingCall.ts    # call:incoming 소켓 → incomingCall 상태 관리
│   │   └── useNotifications.ts   # FCM 디바이스 토큰 + 포그라운드/탭 핸들러 + FCM 딥링크
│   ├── screens/
│   │   ├── LoginScreen.tsx          # 탭 UI: 소셜(Google/Kakao/Line) + 이메일/비밀번호
│   │   ├── SignUpScreen.tsx
│   │   ├── ProfileSetupScreen.tsx   # 닉네임 중복 확인 + createProfile
│   │   ├── LanguageSetupScreen.tsx  # 언어 설정 → InterestsSetup 이동
│   │   ├── InterestsSetupScreen.tsx # 관심사 — 마운트 시 기존 관심사 로드 + 실 저장
│   │   ├── HomeScreen.tsx           # 매칭 시작 화면
│   │   ├── MatchingScreen.tsx       # 매칭 대기 화면
│   │   ├── CallScreen.tsx           # 통화 화면 (WebRTC)
│   │   ├── MatchResultScreen.tsx    # 통화 결과 + 친구 신청
│   │   ├── FriendListScreen.tsx     # 친구 목록 + 친구 요청 수락/거절
│   │   ├── MyPageScreen.tsx         # 마이페이지
│   │   └── BlockListScreen.tsx      # 차단 목록 조회 + 해제 (block-list)
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
├── MatchResult  { sessionId: number, partnerId?: string, totalTime: string }
├── Chat         { roomId: number, friendNickname: string, friendProfileImageUrl?: string }
└── BlockList    (undefined)
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

### 에러 응답 형식 (2026-03-23 통일)
모든 HTTP 에러 응답이 ApiResponse 형식으로 통일됨:
```json
{ "success": false, "code": "에러코드", "message": "메시지", "timestamp": "2026-03-23T..." }
```

| HTTP | code | 상황 |
|------|------|------|
| 400 | `INVALID_INPUT` | 유효성 실패, 잘못된 JSON, 지원 안 되는 메서드/타입 |
| 401 | `INVALID_TOKEN` / `EXPIRED_TOKEN` | 토큰 없음·만료·쿠키 누락 |
| 403 | `ACCESS_DENIED` / `MESSAGE_BLOCKED` | 권한 없음, 차단 상태 메시지 전송 |
| 404 | `*_NOT_FOUND` | 리소스 없음 |
| 409 | `ALREADY_IN_CALL` / `DUPLICATE_FRIEND_REQUEST` 등 | 충돌 상태 |
| 429 | `TOO_MANY_REQUESTS` | 로그인/소셜 분당 10회, 회원가입 시간당 5회 초과 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

> 프론트 핸들링: HTTP 상태코드 기반으로 처리 (기존 코드 호환). `code` 필드 분기는 `MatchResultScreen` (409 케이스)만 해당.

### 스타일링
- NativeWind `className` prop 우선 사용
- 동적 값이 필요한 경우만 `StyleSheet.create` 혼용

### 타입 규칙
- `sessionId` 는 항상 `number` (string 사용 금지)
- `MatchResultData` = `{ profile: { id, userId, nickname, profileImageUrl?, bio? }, wantAgain: boolean }` — 친구 신청 시 `profile.userId` 사용 (profile.id 아님)

---

## 6. 백엔드 API 참조

> 백엔드 상세 명세: `C:\Users\PM\OneDrive\Desktop\PM\connecto\CLAUDE.md` 참조
>
> 공통 응답 형식: `{ success: boolean, data: T, message?: string }`

### 6.1 인증 (`/auth`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/auth/signup` | 회원가입 | ✅ |
| POST | `/auth/login` | 이메일/비밀번호 로그인 → accessToken(body) + refreshToken(Set-Cookie) | ✅ |
| POST | `/auth/social-login` | 소셜 로그인 `{ provider, token }` → accessToken + refreshToken | ✅ 2026-03-07 |
| POST | `/auth/refresh` | 토큰 갱신 (Cookie 기반) | ✅ |
| POST | `/auth/logout` | 로그아웃 | ✅ |

### 6.2 사용자 (`/users`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| GET | `/users/me` | user + profile + languages + interests 통합 조회 | ✅ |
| PUT | `/users/me` | 비밀번호 수정 `{ password }` | ✅ |
| DELETE | `/users/me` | 회원 탈퇴 (soft delete) | ✅ |
| GET | `/users/exists/email?email=` | 이메일 중복 확인 | ✅ |

**GET /users/me 응답:**
```typescript
{
  user: { id: number, email: string, createdAt: string },
  profile: { id: number, nickname: string, profileImageUrl?: string, bio?: string } | null,
  languages: Array<{ id: number, languageCode: string, type: "NATIVE"|"LEARNING", level: "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|"NATIVE" }>,
  interests: Array<{ id: number, tag: string }>
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
| POST | `/users/me/interests` | 관심사 단건 추가 `{ tag: string }` → 201 (409: 중복) | ✅ 2026-03-06 |
| GET | `/users/me/interests` | 관심사 조회 → `[{ id, tag }]` | ✅ 2026-03-06 |
| DELETE | `/users/me/interests/{id}` | 관심사 단건 삭제 | ✅ 2026-03-06 |

### 6.5 매칭 (`/match`) — Redis 필요

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/match/start` | 대기열 진입 | ✅ |
| POST | `/match/cancel` | 대기 취소 | ✅ |
| GET | `/match/status` | 현재 매칭 상태 | ✅ |
| GET | `/match/result/{sessionId}` | 통화 종료 후 상대 프로필 | ✅ |

**GET /match/result/{sessionId} 응답:**
```typescript
{ profile: { id: number, userId: number, nickname: string, profileImageUrl?: string, bio?: string }, wantAgain: boolean }
// userId = 백엔드 User PK (친구 신청 receiverId로 사용), id = Profile PK
```

### 6.6 통화 (`/call`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/call/end` | 통화 종료 `{ sessionId }` | ✅ |
| POST | `/call/again` | 재연결 의사 `{ sessionId, wantAgain }` | ✅ |
| POST | `/call/request/{friendId}` | 친구에게 통화 요청 → `{ sessionId, webrtcChannelId, friendId }` + FCM 전송 | ✅ 2026-03-06 |
| POST | `/call/reject/{sessionId}` | 수신자가 통화 거절 → 발신자에게 `call:rejected { sessionId }` 소켓 emit | ✅ 2026-03-26 |

### 6.7 푸시 알림 (`/users/me/device-token`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/users/me/device-token` | FCM 디바이스 토큰 등록/갱신 `{ token, platform: "android"\|"ios" }` | ✅ 2026-03-09 |
| DELETE | `/users/me/device-token` | 토큰 삭제 (logout 시 백엔드 자동 처리) | ✅ 2026-03-09 |

### 6.9 WebRTC (`/webrtc`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| GET | `/webrtc/turn-credentials` | 단기 TURN 자격증명 조회 → `{ iceServers: RTCIceServer[], ttl: number }` (SEC-H1) | ✅ 2026-03-14 |

### 6.10 채팅 (`/chat`)

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| POST | `/chat/rooms` | 채팅방 생성 (이미 있으면 기존 반환) `{ friendId }` | ✅ |
| GET | `/chat/rooms` | 채팅방 목록 조회 (최신 메시지 순) | ✅ |
| GET | `/chat/rooms/{roomId}/messages?page=0&size=50` | 메시지 히스토리 (최신순 페이징) | ✅ |
| POST | `/chat/rooms/{roomId}/messages/image` | 이미지 전송 `multipart/form-data` (part: "image", 최대 10MB) → ChatMessage | ✅ 2026-03-25 |

**GET /chat/rooms 응답:**
```typescript
[{ roomId: number, friendId: number, friendNickname: string, friendProfileImageUrl: string | null, lastMessage: string | null, unreadCount: number, updatedAt: string }]
```

**GET /chat/rooms/{roomId}/messages 응답:**
```typescript
{ messages: [{ id: number, senderId: number, content: string | null, imageUrl?: string | null, messageType?: "TEXT" | "IMAGE", createdAt: string }], hasNext: boolean, page: number, size: number }
```

**chat:receive 소켓 payload:**
```typescript
{ roomId: number, message: { id: number, senderId: number, content: string | null, imageUrl?: string | null, messageType?: "TEXT" | "IMAGE", createdAt: string } }
```

### 6.8 친구 / 신고

| 메서드 | 엔드포인트 | 설명 | BE 상태 |
|--------|-----------|------|---------|
| GET | `/friends` | 친구 목록 → `[{ friendshipId, userId, nickname, profileImageUrl, bio, friendSince }]` | ✅ 2026-03-06 |
| GET | `/friends/requests` | 받은 친구 요청 목록 (PENDING) | ✅ 2026-03-06 |
| POST | `/friends/request` | 친구 신청 `{ receiverId }` | ✅ 2026-03-06 |
| PATCH | `/friends/request/{id}/accept` | 친구 요청 수락 | ✅ 2026-03-06 |
| PATCH | `/friends/request/{id}/reject` | 친구 요청 거절 | ✅ 2026-03-06 |
| GET | `/friends/check?userId={targetUserId}` | 친구/차단 여부 확인 → `{ isFriend, friendshipId, isBlocked }` | ✅ 2026-03-18 |
| DELETE | `/friends/{friendshipId}` | 친구 삭제 | ✅ 2026-03-18 |
| POST | `/friends/{friendshipId}/block` | 친구 차단 (친구 관계 삭제 + 차단 생성) | ✅ 2026-03-18 |
| GET | `/users/me/blocks` | 차단 목록 조회 → `[{ blockedUserId, nickname, profileImageUrl, blockedAt }]` | ✅ 2026-03-25 |
| DELETE | `/users/me/blocks/{blockedUserId}` | 차단 해제 | ✅ 2026-03-18 |
| POST | `/reports` | 신고 `{ sessionId, reportedUserId, reason? }` | ✅ 2026-03-06 |

---

## 7. Socket.IO 이벤트 참조

- **연결:** `EXPO_PUBLIC_SOCKET_URL` (기본 `http://localhost:9092`)
- **인증:** `extraHeaders: { Authorization: Bearer <token> }` + `query: { token }` (netty-socketio 2.0.3은 auth 객체 미지원)
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
| on | `friend:status-change` | `{ friendId, isOnline: boolean }` | ✅ 2026-03-16 |
| emit | `chat:join` | `{ roomId: number }` — 채팅방 진입 시 룸 참가 (재연결 시 자동 재emit) | ✅ 2026-03-26 |
| emit | `chat:leave` | `{ roomId: number }` — 채팅방 퇴장 시 룸 나가기 | ✅ 2026-03-26 |
| emit | `chat:send` | `{ roomId: number, content: string }` | ✅ 2026-03-18 |
| ~~on~~ | ~~`chat:sent`~~ | ~~서버 ACK, 발신자에게만~~ | ❌ 제거됨 (2026-03-31) — `chat:receive` 단일 이벤트로 통일 |
| on | `chat:receive` | `{ roomId: number, message: ChatMessage }` — 발신자·수신자 모두 수신. `senderId === myUserId`로 내 메시지 구분. dedup 처리 | ✅ 2026-03-31 |
| on | `chat:error` | `{ message: string }` | ✅ 2026-03-18 |
| emit | `chat:typing` | `{ roomId: number }` — 입력 중 (1초 쓰로틀, 백엔드 디바운싱 없음) | ✅ 2026-03-25 |
| on | `chat:typing` | `{ roomId: number }` — 상대방 입력 중 표시 (3초 후 자동 hide) | ✅ 2026-03-25 |
| emit | `chat:read` | `{ roomId: number }` — 포커스 중 상대방 메시지 수신 시 읽음 처리 | ✅ 2026-03-31 |
| on | `chat:read` | `{ roomId, readerId, lastReadMessageId }` — 상대방 읽음 수신 → `id <= lastReadMessageId` 내 메시지에 ✓✓ | ✅ 2026-03-31 |
| on | `call:rejected` | `{ sessionId: number }` — 발신자 측 수신. 수신자가 거절 시 발신 화면 goBack() | ✅ 2026-03-26 |

---

## 8. 핵심 비즈니스 로직

1. **온보딩:** SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs (신규 유저) / 토큰 복원 → MainTabs (기존 유저)
2. **매칭:** `POST /match/start` + `socket.emit("match:start")` → `match:success { sessionId, webrtcChannelId, isOfferer }` → CallScreen
3. **WebRTC 통화:** `webrtc:join` → isOfferer가 offer 생성 → ICE 교환 → 5분 통화 → `POST /call/end` → MatchResultScreen
4. **통화 결과:** 상대 프로필 조회 / 친구 신청(`POST /friends/request`) / 재연결(`POST /call/again`)
5. **친구 관리:** 친구 목록(`GET /friends`) / 요청 수락·거절(`PATCH /friends/request/{id}/accept|reject`) / 친구 통화(`POST /call/request/{friendId}`) → `{ sessionId, webrtcChannelId }` → CallScreen(isOfferer: true)
6. **채팅:** `POST /chat/rooms` (채팅방 생성/조회) → `socket.emit("chat:join", { roomId })` (서버 자동 읽음 처리) → `socket.emit("chat:send", { roomId, content })` → `chat:receive { roomId, message }` 실시간 수신 (발신자 포함 룸 브로드캐스트, `senderId === myUserId`로 echo 구분). 상대방 메시지 수신 시 `socket.emit("chat:read", { roomId })` → 상대방 `chat:read` 수신 시 ✓✓ 표시. 퇴장 시 `socket.emit("chat:leave", { roomId })`

---

## 9. 구현 현황 (항상 최신 유지)

> **마지막 업데이트:** 2026-04-03 (채팅 탭 전환 후 실시간 누락 버그 수정, 초기 스크롤 수정, 중복 API 호출 제거)
> 기능 개발 완료 시 이 섹션을 반드시 업데이트할 것.

### 프론트엔드 완료 ✅

| 기능 | 주요 파일 | 비고 |
|------|----------|------|
| 회원가입 | `SignUpScreen.tsx`, `auth.ts` | 이메일 중복 확인 포함 |
| 소셜 로그인 | `LoginScreen.tsx`, `auth.ts` | 탭 UI: Google OAuth 연동 ✅ / Kakao·Line 준비중, `loginWithSocial()` → `/auth/social-login` |
| 이메일 로그인 | `LoginScreen.tsx` | 이메일 탭, `!me.profile` → ProfileSetup |
| 프로필 설정 | `ProfileSetupScreen.tsx` | 닉네임 중복 확인 + `createProfile` |
| 언어 설정 | `LanguageSetupScreen.tsx` | `saveLanguage()` → InterestsSetup 이동. 각 저장 독립 처리 (409는 성공으로 간주) |
| 관심사 설정 | `InterestsSetupScreen.tsx`, `languages.ts` | `getInterests()` → `[{ id, tag }]` 정상 파싱. `saveInterests()` → GET→DELETE removed→POST added (단건씩) |
| 토큰 영속화 | `authStore.ts` | SecureStore, `persistTokens` / `loadTokens` / `logout` |
| 앱 시작 라우팅 | `App.tsx` | `isHydrating` → 토큰 복원 → `getMe` → 라우팅 |
| 매칭 | `MatchingScreen.tsx`, `useSocketMatching.ts` | Socket + REST polling fallback |
| WebRTC 통화 | `CallScreen.tsx`, `useWebRTC.ts`, `api/webrtc.ts` | `isOfferer` 서버 수신, TURN 자격증명 서버 API 조회 (SEC-H1), STUN fallback, 30초 잠금, 재연결 |
| 통화 결과 | `MatchResultScreen.tsx` | 상대 프로필, 친구 신청, 재연결, 신고 |
| 친구 목록 | `FriendListScreen.tsx`, `friends.ts` | 실 API, 친구 요청 수락/거절, FriendDetail 모달, 친구 통화 요청 → CallScreen 이동 |
| 마이페이지 | `MyPageScreen.tsx` | 프로필 조회·수정, 이미지 업로드(S3), 로그아웃, 회원 탈퇴 |
| 언어 설정 편집 | `MyPageScreen.tsx`, `languages.ts` | MyPage 언어 카드 인라인 편집 (PUT /users/me/languages) |
| 코드 품질 개선 | 다수 파일 | H-1~H-9 버그 수정, CharacterBlob 컴포넌트 추출 (app-quality) |
| 푸시 알림 | `useNotifications.ts`, `notifications.ts` | FCM 디바이스 토큰, Android 채널, 포그라운드·탭 핸들러 (push-notifications) |
| API 명세 동기화 | `languages.ts`, `friends.ts`, `auth.ts`, `FriendListScreen.tsx` | Swagger 기반 응답 형식 불일치 3건 수정 (2026-03-10) |
| 상대방 프로필 보기 | `MatchResultScreen.tsx` | MatchResultScreen 친구 연결 완료 시 "프로필 보기" 버튼 → Modal 표시 (partner-profile, 100% 설계 일치) |
| 보안 수정 (프론트) | `LoginScreen.tsx`, `SignUpScreen.tsx`, `socket.ts`, `MyPageScreen.tsx`, `MatchResultScreen.tsx`, `useWebRTC.ts`, `babel.config.js` | SEC-H3 rate limiting, SEC-H4 소켓 auth 복구, SEC-M1 maxLength, SEC-M2 프로덕션 console 제거, SEC-M4 이미지 검증 강화, SEC-M7 IDOR 방지, SEC-L2 비밀번호 초기화, SEC-L3 탈퇴 재인증 Modal |
| TURN 자격증명 보안 (SEC-H1) | `src/api/webrtc.ts`, `src/hooks/useWebRTC.ts` | GET /webrtc/turn-credentials API 연동, 실패 시 STUN only fallback |
| Socket.IO 인증 방식 수정 | `src/api/socket.ts` | netty-socketio 2.0.3 auth 객체 미지원 확인 → extraHeaders + query 방식으로 전환 |
| WebRTC offer/answer 직렬화 수정 | `src/hooks/useWebRTC.ts` | react-native-webrtc v124에서 toJSON() 없음 → `{ type, sdp }` 직접 구성 |
| Axios 401 interceptor 수정 | `src/api/client.ts` | setAccessToken → persistTokens로 변경 (SecureStore 영속화) |
| WebRTC 초기화 실패 시 세션 정리 | `src/hooks/useWebRTC.ts` | startConnection catch에서 endCall(sessionId) 호출 → stale session 방지 |
| 친구 신청 403 수정 | `src/api/match.ts`, `src/screens/MatchResultScreen.tsx` | profile.id(프로필 PK) → profile.userId(유저 PK)로 receiverId 수정 |
| 앱 아이콘 교체 | `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `app.json` | Gemini 생성 이미지 적용, adaptive backgroundColor #8B5CF6 |
| Babel 캐싱 충돌 수정 | `babel.config.js` | api.cache(true) + api.env() 충돌 → api.cache(true) 제거 |
| .env.production | `.env.production` | HTTPS 프로덕션 URL 분리 (api.connecto.app, socket.connecto.app) |
| 소켓 이벤트 연동 (2026-03-16) | `CallScreen.tsx`, `MatchResultScreen.tsx`, `FriendListScreen.tsx` | `call:ended` 상대방 종료 자동 이동, `call:rematch` 재통화 진입, `call:incoming` 친구 통화 팝업 |
| IncomingCallModal | `src/hooks/useIncomingCall.ts`, `src/components/IncomingCallModal.tsx`, `App.tsx` | 친구 통화 요청 수락/거절 전역 팝업. App.tsx에서 렌더링 |
| ICE 자동 종료 버그 수정 | `src/hooks/useWebRTC.ts` | `wasConnectedRef` — ICE 연결된 적 없으면 onCallEnd 미호출 (에뮬레이터 false-positive 방지) |
| call_rematch FCM 딥링크 | `src/hooks/useNotifications.ts` | FCM data payload string 파싱(sessionId/isOfferer), 백그라운드 → Call 화면 직접 이동 |
| 친구 온라인 상태 표시 | `src/screens/FriendListScreen.tsx` | `friend:status-change` 소켓 수신 → `onlineStatusMap` 업데이트 → 아바타 초록 점 표시 |
| 친구 신청 409 UX | `src/screens/MatchResultScreen.tsx` | DUPLICATE_FRIEND_REQUEST → "신청 완료" 표시, 이미 친구 → "친구로 연결됨" 전환 |
| 인증서 피닝 인프라 (SEC-M6) | `android/app/src/main/res/xml/network_security_config.xml`, `android/app/src/debug/res/xml/network_security_config.xml` | Android Network Security Config. 릴리즈: `api.connecto.app`/`socket.connecto.app` 피닝. 디버그: 비활성화. 배포 전 SPKI 해시 교체 필요 |
| 채팅 기능 | `src/screens/ChatListScreen.tsx`, `src/screens/ChatScreen.tsx`, `src/api/chat.ts` | 채팅방 목록, 실시간 채팅. 소켓 `chat:send` emit / `chat:receive` on (발신자 포함 룸 브로드캐스트). 폴링 제거 완료 |
| socket.ts 안정성 개선 | `src/api/socket.ts` | `getSocket()` — reconnection 중 `removeAllListeners()` 후 새 인스턴스 생성하던 버그 수정. `socketInstance === null` 일 때만 생성, 재연결은 Socket.IO 내장 메커니즘에 위임 |
| 채팅 "전송 중..." 버그 수정 | `src/screens/ChatScreen.tsx` | 백엔드가 sender에게 chat:receive echo 미전송 → 폴링에서 pendingQueue content 매칭으로 temp 메시지 교체 (2026-03-24) |
| ChatListScreen UX 개선 | `src/screens/ChatListScreen.tsx` | 미읽 메시지 뱃지(숫자), 실시간 시간 표시(1분 interval), 온라인/오프라인 점(Discord 스타일), -1일전 버그 수정(서버/클라이언트 시계 오차 대응) (2026-03-24) |
| 채팅 미읽 카운트 영속화 | `src/screens/ChatListScreen.tsx` | `@react-native-async-storage/async-storage` 도입. 앱 재시작 후 미읽 카운트 유지. 로드 완료 후에만 저장(unreadLoadedRef guard) (2026-03-25) |
| 채팅 타이핑 인디케이터 | `src/screens/ChatScreen.tsx` | `chat:typing` emit(1초 쓰로틀) + on 핸들러(3초 hide) + UI. 백엔드 relay ✅ 완료 (2026-03-25) |
| 채팅 폴링 제거 | `src/screens/ChatScreen.tsx` | 백엔드 sender echo 완료로 4초 폴링 useEffect 삭제, AppState import 제거 (2026-03-25) |
| 채팅 이미지 전송 | `src/screens/ChatScreen.tsx`, `src/api/chat.ts` | expo-image-picker, 5MB 제한, temp 버블 + 로딩 overlay, echo dedup, 📷 버튼 UI (2026-03-25) |
| ~~chat:sent ACK 처리~~ | ~~`src/screens/ChatScreen.tsx`~~ | ~~서버 ACK 수신 시 temp 메시지 즉시 교체~~ → ❌ chat:sent 핸들러 제거 완료 (2026-03-31) — chat:receive 단일 이벤트로 통일 |
| 차단 목록 UI | `src/screens/BlockListScreen.tsx`, `src/api/friends.ts` | GET /users/me/blocks 연동, FlatList + 차단 해제 Alert, 빈 상태 처리, MyPage 진입점 (2026-03-25) |
| 통화 거절 처리 | `src/api/call.ts`, `src/components/IncomingCallModal.tsx`, `src/screens/CallScreen.tsx` | 수신자: 거절 버튼 → POST /call/reject/{sessionId} (fire-and-forget). 발신자: call:rejected 소켓 수신 → goBack() (2026-03-26) |
| ChatList 독립 탭 | `src/navigation/MainTabNavigator.tsx`, `src/navigation/types.ts`, `src/screens/ChatListScreen.tsx` | 탭 구조 4개로 확장: Home → FriendList → ChatList → MyPage. ChatList 탭 분리 (2026-03-26) |
| WebRTC offer 버퍼링 수정 | `src/hooks/useWebRTC.ts` | webrtc:offer 리스너를 PC 초기화 전 즉시 등록. PC 준비 전 도착한 offer를 pendingOfferRef에 버퍼링 후 처리 (2026-03-26) |
| 채팅 소켓 연결 검증 | `src/screens/ChatScreen.tsx` | socket.connected 체크 추가. 연결 끊긴 상태에서 전송 시도 시 Alert 표시 (2026-03-26) |
| 채팅 룸 기반 라우팅 | `src/screens/ChatScreen.tsx` | chat:join emit (마운트 시), chat:leave emit (언마운트 시), 재연결 시 자동 rejoin. 백엔드 userId→socketId stale 맵 문제 해결 (2026-03-26) |
| chat:receive 단일 이벤트 전환 | `src/screens/ChatScreen.tsx` | chat:sent 핸들러 제거, 5초 fallback 제거. handleReceive에서 `senderId === myUserId`로 내 echo 처리 통일 (2026-03-31) |
| 이미지 중복 렌더링 수정 | `src/screens/ChatScreen.tsx` | socket echo → REST 201 순서 도착 시 tempId filter로 중복 방지. `prev.some(m => m.id === sent.id)` 체크 (2026-03-31) |
| 채팅 unreadCount 서버 기반 전환 | `src/screens/ChatListScreen.tsx`, `src/api/chat.ts` | `ChatRoom.unreadCount` 서버 제공값 사용. AsyncStorage 로컬 추적 제거. chat:receive 시 room.unreadCount+1 직접 업데이트 (2026-03-31) |
| 채팅 읽음 표시 (chat:read) | `src/screens/ChatScreen.tsx` | emit: 상대방 메시지 수신 시 `chat:read { roomId }`. on: `partnerLastReadId` 추적 → `id <= partnerLastReadId` 내 메시지에 ✓✓ 표시 (2026-03-31) |
| 채팅 탭 전환 후 실시간 누락 수정 | `src/screens/ChatScreen.tsx` | `useEffect` → `useFocusEffect`로 교체. 화면 포커스될 때마다 `chat:join` 재emit + 메시지 갱신. 탭 전환 후 소켓 룸 재참가 보장 (2026-04-03) |
| 채팅 초기 스크롤 수정 | `src/screens/ChatScreen.tsx` | `loadMessages(page=0)` 완료 시 `isAppendingRef=true` 설정 → 첫 진입 시 맨 아래 스크롤 정상 동작 (2026-04-03) |
| 채팅 중복 API 호출 제거 | `src/screens/ChatScreen.tsx` | mount 시 `useEffect` + `useFocusEffect` 둘 다 `loadMessages(0)` 호출하던 중복 제거. `useFocusEffect` 단일 진입점으로 통일 (2026-04-03) |

### 코드 품질 규칙 (app-quality 2026-03-09 적용)

- `handleEndCall`: `isEndingRef.current`로 race condition 방지, navigate는 try 블록 안에서만
- 타이머: `timerRef.current`에 저장 → 통화 종료 시 즉시 clearInterval
- 소켓 cleanup: `socket.off("disconnect")` 포함 필수
- 에러 핸들링: API 실패 시 빈 catch 금지 — Alert 또는 console.warn 필수
- WebRTC: `(pc as any)` 금지 → `RTCPeerConnectionWithEvents` 타입 사용
- 공통 컴포넌트: `src/components/CharacterBlob.tsx` — 캐릭터 blob 재사용
- `GoogleSignin.configure()`: 모듈 레벨 실행 금지 → `useEffect` 내부에서 실행

### 프론트엔드 미구현 / 개발 필요 🔧

| 기능 | 파일 | 상태 |
|------|------|------|
| Kakao·Line 로그인 | `LoginScreen.tsx` | ⏳ 백엔드 미지원 (Google만 지원), "준비 중" Alert 유지 |
| 두 에뮬레이터 동시 매칭 테스트 | AVD 환경 | ✅ Medium_Phone + Medium_Phone_2 구성 완료 (2026-03-24) |

### 알려진 버그 / 개선 필요 🐛

| 우선순위 | 항목 | 파일 | 설명 |
|---------|------|------|------|
| ~~🔴 High~~ ✅ | 채팅 미읽 카운트 영속화 | `ChatListScreen.tsx` | ✅ → 서버 기반으로 대체 (2026-03-31) — `GET /chat/rooms` 응답의 `unreadCount` 사용. AsyncStorage 제거 |
| ~~🔴 High~~ ✅ | 채팅 echo 미수신 | `ChatScreen.tsx` | ✅ 완료 (2026-03-25) — 백엔드 sender echo 추가. 4초 폴링 제거, AppState import 정리 |
| ~~🟡 Medium~~ ✅ | 친구 온라인 초기 상태 미조회 | `ChatListScreen.tsx`, `FriendListScreen.tsx` | ✅ 백엔드 완료 (2026-03-25) — 소켓 connect 시 서버가 `friend:status-change` 자동 push. 프론트 추가 작업 없음 |
| ~~🟡 Medium~~ ✅ | 채팅 타이핑 인디케이터 없음 | `ChatScreen.tsx` | ✅ 완료 (2026-03-25) — 프론트: emit 1초 쓰로틀 + 3초 hide. 백엔드: relay 완료 |
| 🟡 Medium | SEC-H2 미완료 | `.env` | Google OAuth Web Client ID GCP Console authorized URI 제한 미완료 |
| 🟡 Medium | SEC-M6 배포 전 작업 | `network_security_config.xml` | SPKI 해시 PLACEHOLDER → 실제 해시 교체 필요 |
| ~~🟢 Low~~ ✅ | 채팅 이미지 전송 | `ChatScreen.tsx`, `src/api/chat.ts` | ✅ 완료 (2026-03-25) — 📷 버튼, 갤러리 선택, 업로드, 이미지 버블, echo dedup |
| ~~🟢 Low~~ ✅ | 차단 목록 UI | `BlockListScreen.tsx`, `friends.ts` | ✅ 완료 (2026-03-25) — BlockListScreen 신규, GET /users/me/blocks 연동, 차단 해제 확인 Alert |
| 🟢 Low | 매칭 필터 없음 | `HomeScreen.tsx` | 언어/관심사 기반 매칭 조건 설정 UI 미구현 |
| 🟢 Low | iOS 빌드 미테스트 | 전체 | 현재 Android 에뮬레이터만 테스트, iOS 빌드 확인 필요 |

### 보안 수정 현황 🔒 (감사: 2026-03-11 / 프론트 수정: 2026-03-13)

> 전체 보고서: `docs/02-design/security-spec.md` (감사 시 종합 점수 64/100)

#### Critical — 배포 전 필수 (인프라/백엔드 작업 필요)

| ID | 문제 | 파일 | 수정 방법 | 상태 |
|----|------|------|----------|------|
| SEC-C1 | 모든 API/Socket.IO가 HTTP (MITM 취약) | `.env.production` | 프로덕션 URL HTTPS/WSS 전환 — `api.connecto.app`, `socket.connecto.app` | ✅ 완료 (2026-03-14) |
| SEC-C2 | refreshToken 평문 Cookie 헤더 전송 (HTTP) | `src/api/auth.ts:107` | HTTPS 전환으로 자동 해결 (Cookie가 TLS 위에서 전송) | ✅ 완료 (2026-03-14) — SEC-C1과 함께 해결 |

#### High — 출시 전 수정

| ID | 문제 | 파일 | 상태 |
|----|------|------|------|
| SEC-H1 | TURN 자격증명 JS 번들 포함 위험 | `src/api/webrtc.ts`, `src/hooks/useWebRTC.ts` | ✅ 완료 (2026-03-14) — GET /webrtc/turn-credentials API 호출, 실패 시 STUN only fallback |
| SEC-H2 | Google OAuth Web Client ID 번들 노출 | `.env` | ⏳ GCP Console authorized URI 제한 필요 |
| SEC-H3 | 로그인·회원가입 폼 rate limiting 없음 | `LoginScreen.tsx`, `SignUpScreen.tsx` | ✅ 완료 (2026-03-13) — exponential backoff + 30초 쿨다운 |
| SEC-H4 | Socket.IO auth 에러 시 토큰 갱신 미구현 | `socket.ts` | ✅ 완료 (2026-03-13) — connect_error → refresh → 재연결 |

#### Medium — 이후 개선

| ID | 문제 | 파일 | 상태 |
|----|------|------|------|
| SEC-M1 | 닉네임·bio `maxLength` 미설정 | `MyPageScreen.tsx` | ✅ 완료 (2026-03-13) — maxLength 30/500 |
| SEC-M2 | `console.*` 프로덕션 노출 | 다수 파일 | ✅ 완료 (2026-03-13) — babel-plugin-transform-remove-console + __DEV__ 가드 |
| SEC-M4 | 이미지 fileSize undefined 통과 / 치수 미검증 | `MyPageScreen.tsx` | ✅ 완료 (2026-03-13) — undefined 차단 + width/height 검증 |
| SEC-M6 | Axios 인증서 피닝 없음 | `android/app/src/main/res/xml/network_security_config.xml` | ✅ 완료 (2026-03-17) — Android Network Security Config 도입. 릴리즈: 인증서 피닝 적용 (`api.connecto.app`, `socket.connecto.app`). 디버그: 피닝 비활성화 + cleartext 허용. **배포 전 PLACEHOLDER 해시를 실제 SPKI 해시로 교체 필수** |
| SEC-M7 | IDOR 위험 (partnerId 로컬 폴백 사용) | `MatchResultScreen.tsx` | ✅ 완료 (2026-03-13) — 서버 반환 ID만 사용 |

#### Low — 백로그

| ID | 문제 | 상태 |
|----|------|------|
| SEC-L2 | 폼 제출 후 비밀번호 state 미삭제 | ✅ 완료 (2026-03-13) — finally 블록에서 setPassword('') |
| SEC-L3 | 회원 탈퇴 재인증 없음 | ✅ 완료 (2026-03-13) — 비밀번호 재인증 Modal |

### 백엔드 요청 사항 🔧

> **모든 요청 처리 완료 (2026-03-16)**

| 항목 | 처리 내용 | 상태 |
|------|----------|------|
| `POST /call/again` FCM | `call_rematch` FCM data payload 추가. `sessionId`/`webrtcChannelId`/`isOfferer` 모두 string. 프론트 파싱 완료 | ✅ 2026-03-16 |
| ALREADY_IN_CALL stale session | 이미 5분으로 설정되어 있었음 (`CallSessionScheduler.MAX_CALL_DURATION_MINUTES = 5`) | ✅ 확인 |
| `friend:status-change` 소켓 | `MatchSocketHandler` connect/disconnect 훅에서 친구 전원에게 emit 추가. 프론트 온라인 점 표시 완료 | ✅ 2026-03-16 |
| `GET /webrtc/turn-credentials` | SEC-H1 완료 (2026-03-14) — 프론트 연동 완료 | ✅ |

**call_rematch FCM payload 포맷 (data 필드, 모두 string):**
```json
{ "type": "call_rematch", "sessionId": "123", "webrtcChannelId": "uuid", "isOfferer": "true" }
```
처리 순서: bothWantAgain 확정 → FCM data 먼저 → Socket.IO `call:rematch` emit. 소켓 연결 중이면 소켓 이벤트로 처리, FCM 무시.
