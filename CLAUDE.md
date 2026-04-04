# CLAUDE.md — Connecto 프론트엔드

> 이 파일은 코드·package.json·파일시스템에서 읽을 수 없는 맥락과 규칙만 담습니다.
> 백엔드 CLAUDE.md: `C:\Users\PM\OneDrive\Desktop\PM\connecto\CLAUDE.md`
> 원본 스펙 시트: https://docs.google.com/spreadsheets/d/1lawKmS9PrXNMYv2US2IXgCX-SejIFrBuvuZI9DfssRU
> Swagger (백엔드 실행 시): `http://localhost:8080/swagger-ui.html`

---

## 1. 프로젝트 개요

5분 익명 보이스 채팅 기반 실시간 매칭·언어 교환 플랫폼.

| 항목 | 내용 |
|------|------|
| 슬로건 | "지금, 누군가와 5분만 이야기해요." |
| 레포 | `C:\connecto-app` |
| 백엔드 | `C:\Users\PM\OneDrive\Desktop\PM\connecto` |
| 플랫폼 | Android 에뮬레이터 우선 (iOS 미테스트) |

---

## 2. 로컬 개발 환경

```env
# .env (에뮬레이터 기준)
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android_client_id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web_client_id>.apps.googleusercontent.com
```

- 실기기: `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080`
- API prefix 없음 — `/api/v1` 사용 안 함
- REST: 포트 8080 / Socket.IO: 포트 9092 (별도 서버)
- 에뮬레이터 두 대 동시 테스트: Medium_Phone(5554) + Medium_Phone_2(5556)

---

## 3. 아키텍처 결정 사항

### 토큰 관리
`refreshToken`은 백엔드가 `Set-Cookie`로 내리지만 `withCredentials` 미사용.
→ Axios interceptor에서 `set-cookie` 헤더를 **수동 추출**해 `SecureStore`에 저장.
→ `persistTokens` / `loadTokens` / `logout` 모두 **async** — 호출 시 `await` 필수.
→ 401 interceptor: 대기 큐에 쌓고 → refresh → 일괄 재시도.

### isOfferer (WebRTC)
서버가 `match:success` payload에 `isOfferer: boolean` 직접 포함. 타이밍 기반 클라이언트 판단 아님.

### Socket.IO 인증
`netty-socketio 2.0.3`은 `socket.auth` 객체 미지원.
→ `extraHeaders: { Authorization: "Bearer <token>" }` + `query: { token }` 두 곳 모두에 JWT 전달.

### WebRTC SDP 직렬화
`react-native-webrtc v124`에서 `SessionDescription.toJSON()` 없음.
→ offer/answer는 `{ type, sdp }` 객체를 **직접 구성**해서 emit.

### Socket.IO 싱글톤 재연결
`getSocket()`은 `socketInstance === null`일 때만 새 인스턴스 생성.
reconnection 중 `removeAllListeners()` + 재생성 금지 — 내장 재연결 메커니즘에 위임.

### chat:receive 브로드캐스트
서버가 발신자를 **포함한** 룸 전체에 broadcast.
→ `senderId === myUserId`로 내 echo와 상대방 메시지 구분.
→ `chat:sent` ACK 이벤트 없음 (2026-03-31 제거). `chat:receive` 단일 이벤트로 통일.

### chat:join 재emit
탭 전환·화면 복귀 시 소켓 룸 참가 상태가 끊길 수 있음.
→ `useFocusEffect`에서 `chat:join` 재emit 필수.

### WebRTC offer 버퍼링
Answerer가 PC 초기화 전에 `webrtc:offer`를 받을 수 있음.
→ offer 리스너를 PC 초기화 전에 먼저 등록, 도착한 offer는 `pendingOfferRef`에 버퍼링 후 PC 준비 완료 시 처리.

### 이미지 메시지 lastMessage
백엔드는 이미지 메시지를 보낼 때 `lastMessage: "사진"`(고정 문자열)으로 내림.
→ ChatListScreen에서 null인 경우는 "대화 없음"으로 처리해도 무방.

---

## 4. 네비게이션 플로우

```
신규 유저: SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
기존 유저: App 시작 → loadTokens() → getMe() → MainTabs
토큰 만료: App 시작 → loadTokens() → getMe() 실패 → Login
getMe() 후 me.profile === null → ProfileSetup (소셜 로그인 신규 유저)
```

Stack initialRoute: `"Login"` | MainTabs: Home · FriendList · ChatList · MyPage

---

## 5. 개발 규칙

### 커밋 타입
`feat` / `ui` / `fix` / `chore` / `refactor`

### API 작성
- `src/api/` 하위 도메인별 파일 분리
- 함수 위 JSDoc에 HTTP 메서드 + 엔드포인트 명시
- `response.data.data`로 실제 데이터 추출 (공통 래퍼 unwrap)
- 백엔드 미구현 API: try/catch fallback (앱 크래시 방지)

### 코드 품질
- race condition 방지: `isEndingRef.current` 패턴 사용 (state 아님)
- 소켓 cleanup: `socket.off("disconnect")` 포함 필수
- 빈 catch 금지 — `Alert` 또는 `console.warn` 사용
- `GoogleSignin.configure()`: 모듈 레벨 실행 금지 → `useEffect` 내부

### 타입 규칙
- `sessionId`: 항상 `number` (string 금지)
- 친구 신청 receiverId: `profile.userId` 사용 (`profile.id` 아님 — Profile PK vs User PK 혼동 주의)
