# Design: webrtc-call

**기반 Plan**: `docs/01-plan/features/webrtc-call.plan.md`
**작성일**: 2026-03-06

---

## 1. 변경 범위

| 파일 | 변경 유형 | 핵심 변경 |
|------|----------|----------|
| `src/hooks/useSocketMatching.ts` | 수정 | `MatchResult`에 `isOfferer` 추가, `POST /match/start` 호출 추가 |
| `src/hooks/useWebRTC.ts` | 수정 | `webrtc:join` emit, `isOfferer` prop으로 Offerer 결정, TURN 서버 |
| `src/screens/CallScreen.tsx` | 수정 | `isOfferer` prop 전달, 재연결 버튼 추가 |
| `src/navigation/types.ts` | 수정 | `Call` params에 `isOfferer: boolean` 추가 |

---

## 2. 타입 변경

### `src/hooks/useSocketMatching.ts`
```typescript
// 변경 전
export type MatchResult = {
  sessionId: string;
  webrtcChannelId: string;
};

// 변경 후
export type MatchResult = {
  sessionId: string;
  webrtcChannelId: string;
  isOfferer: boolean;  // 추가: 서버가 지정한 Offer 생성 측
};
```

### `src/navigation/types.ts`
```typescript
// 변경 전
Call: {
  sessionId: string;
  webrtcChannelId: string;
};

// 변경 후
Call: {
  sessionId: string;
  webrtcChannelId: string;
  isOfferer: boolean;  // 추가
};
```

### `src/hooks/useWebRTC.ts`
```typescript
// 변경 전
type WebRTCHookParams = {
  sessionId: string;
  webrtcChannelId: string;
  remoteUserId?: string;
  onCallEnd?: () => void;
};

// 변경 후
type WebRTCHookParams = {
  sessionId: string;
  webrtcChannelId: string;
  isOfferer: boolean;    // 추가: true면 Offer 생성, false면 수신 대기
  remoteUserId?: string;
  onCallEnd?: () => void;
};
```

---

## 3. 구현 상세 설계

### 3.1 `useSocketMatching.ts` — startMatching() 수정

**변경 전 흐름:**
```
socket.emit("match:start") → 소켓 이벤트 대기
```

**변경 후 흐름:**
```
POST /match/start (REST) → 성공 → socket.emit("match:start") → 이벤트 대기
                         → 실패 → error 상태 설정, 매칭 중단
```

```typescript
const startMatching = useCallback(async () => {
  setStatus("matching");
  setError(null);
  setMatchResult(null);

  // 1. REST API 먼저 호출
  try {
    await apiClient.post("/match/start");
  } catch (e) {
    setError("매칭 시작 실패");
    setStatus("idle");
    return;
  }

  // 2. 소켓 연결 및 이벤트 수신 (기존 로직 유지)
  const socket = getSocket();
  // ... 이하 기존 소켓 로직
}, [...]);
```

### 3.2 `useWebRTC.ts` — startConnection() 수정

**변경 전 흐름:**
```
소켓 연결 → PeerConnection 초기화 → 로컬 스트림 → setTimeout(500) → createOffer()
```

**변경 후 흐름:**
```
소켓 연결
  → socket.emit("webrtc:join", { channelId: webrtcChannelId, sessionId })
  → PeerConnection 초기화
  → 로컬 스트림
  → if (isOfferer) → createOffer()
  → if (!isOfferer) → webrtc:offer 이벤트 수신 대기
```

**핵심 변경 코드:**
```typescript
// webrtc:join emit 추가
socket.emit("webrtc:join", {
  channelId: webrtcChannelId,
  sessionId,
});

// setTimeout + createOffer() 제거 후 교체
if (isOfferer) {
  await createOffer();
}
// isOfferer=false인 쪽은 webrtc:offer 이벤트 리스너만 등록 (기존 코드 유지)
```

**TURN 서버 설정 추가:**
```typescript
// 변경 전
const iceServers = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

// 변경 후
const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
const iceServers = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    ...(turnUrl ? [{
      urls: turnUrl,
      username: process.env.EXPO_PUBLIC_TURN_USERNAME ?? "",
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL ?? "",
    }] : []),
  ],
};
```

### 3.3 `CallScreen.tsx` — isOfferer prop 전달 + 오류 UI

```typescript
// route.params에서 isOfferer 추가 수신
const { sessionId, webrtcChannelId, isOfferer } = route.params;

// useWebRTC에 isOfferer 전달
const { isConnected, error: webrtcError } = useWebRTC({
  sessionId,
  webrtcChannelId,
  isOfferer,  // 추가
});

// 오류 시 재연결 버튼 (기존 에러 텍스트 아래에 추가)
{webrtcError && (
  <>
    <Text className="text-xs text-red-300 mt-1 text-center px-4">
      {webrtcError}
    </Text>
    <Pressable
      onPress={() => {/* cleanup 후 startConnection 재호출 */}}
      className="mt-2 px-4 py-1 rounded-full border border-white/40"
    >
      <Text className="text-xs text-white/80">재연결</Text>
    </Pressable>
  </>
)}
```

---

## 4. 전체 통화 플로우 (수정 후)

```
MatchingScreen
  └─ startMatching()
       ├─ POST /match/start
       ├─ socket.emit("match:start")
       └─ socket.on("match:success", { sessionId, webrtcChannelId, isOfferer })
            └─ navigation.replace("Call", { sessionId, webrtcChannelId, isOfferer })

CallScreen (mount)
  └─ useWebRTC({ sessionId, webrtcChannelId, isOfferer })
       ├─ socket.emit("webrtc:join", { channelId, sessionId })
       ├─ initializePeerConnection()
       ├─ initializeLocalStream()  ← 마이크 권한 요청
       └─ if (isOfferer)
            └─ createOffer() → socket.emit("webrtc:offer", { sdp, to, sessionId })
          else
            └─ socket.on("webrtc:offer") 대기
                 └─ createAnswer() → socket.emit("webrtc:answer", { sdp, to, sessionId })

  양쪽: socket.on("webrtc:ice") → addIceCandidate()
  ICE connected → isConnected = true → UI에 "연결됨" 표시

CallScreen (5분 후 or 종료 버튼)
  └─ handleEndCall() → POST /call/end → navigation.replace("MatchResult")
  └─ useWebRTC cleanup() → 트랙 stop, PeerConnection.close(), 리스너 off
```

---

## 5. 환경변수 추가 (선택)

```env
# .env (TURN 서버 — 백엔드 팀 제공 시 추가)
EXPO_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
EXPO_PUBLIC_TURN_USERNAME=username
EXPO_PUBLIC_TURN_CREDENTIAL=credential
```

TURN 서버 없으면 해당 환경변수 미설정 → STUN only로 동작 (기존과 동일)

---

## 6. 구현 순서

1. `src/navigation/types.ts` — `Call` params에 `isOfferer: boolean` 추가
2. `src/hooks/useSocketMatching.ts` — `MatchResult` 타입 + `startMatching()` 수정
3. `src/hooks/useWebRTC.ts` — `isOfferer` param, `webrtc:join` emit, TURN 설정
4. `src/screens/CallScreen.tsx` — `isOfferer` 수신 + 재연결 버튼
5. TypeScript 컴파일 확인: `npx tsc --noEmit`

---

## 7. 백엔드 의존성 (협의 필요)

| 항목 | 내용 | 상태 |
|------|------|------|
| `match:success` 이벤트에 `isOfferer` 필드 | 서버가 한 쪽에 true, 다른 쪽에 false 전달 | **백엔드 협의 필요** |
| `webrtc:join` 이벤트 처리 | 서버가 channelId 룸에 클라이언트 추가 | **백엔드 확인 필요** |
| TURN 서버 URL 제공 | 실기기 테스트 시 필요 | 선택사항 |
