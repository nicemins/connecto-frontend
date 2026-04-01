# 백엔드 작업 지시 — 채팅 타이핑 인디케이터

> **요청일**: 2026-03-25
> **요청자**: 프론트엔드
> **우선순위**: 🟡 Medium
> **관련 파일**: `src/screens/ChatScreen.tsx` (프론트 구현 완료)

---

## 개요

채팅 화면에서 상대방이 메시지를 입력 중일 때 "OO이(가) 입력 중..." 인디케이터를 표시하는 기능입니다.
**프론트엔드 구현은 완료**되어 있으며, 백엔드에서 Socket.IO 이벤트 relay만 추가하면 즉시 동작합니다.

---

## 요청 작업

### Socket.IO 이벤트 추가: `chat:typing`

| 항목 | 내용 |
|------|------|
| 이벤트명 | `chat:typing` |
| 방향 | Client → Server → Client (relay) |
| 서버 역할 | emit 수신 후 같은 채팅방의 **상대방에게만** relay |

### Emit (클라이언트 → 서버)

```json
{
  "roomId": 42
}
```

### Relay (서버 → 상대방 클라이언트)

```json
{
  "roomId": 42
}
```

> **주의**: relay 시 `senderId`는 포함하지 않아도 됩니다 (프론트에서 roomId 기반으로만 처리).
> 또는 포함해도 무방합니다 — 프론트가 `data.roomId !== roomId` 체크만 수행합니다.

---

## 구현 가이드

### 처리 로직

1. 클라이언트가 `chat:typing { roomId }` emit
2. 서버: 해당 `roomId`의 채팅방 조회 → 상대방 userId 확인
3. 서버: 상대방 소켓에 `chat:typing { roomId }` relay
4. **본인에게는 relay 하지 않음** (자기 자신 제외)

### 기존 `chat:send` 처리와 동일한 패턴으로 구현

```java
// 예시 (기존 chat:send 핸들러 참고)
@OnEvent("chat:typing")
public void onChatTyping(SocketIOClient client, TypingRequest request) {
    Long userId = getUserIdFromClient(client);
    Long roomId = request.getRoomId();

    // 채팅방의 상대방 userId 조회
    Long partnerId = chatService.getPartnerId(roomId, userId);
    if (partnerId == null) return;

    // 상대방 소켓에 relay
    SocketIOClient partnerClient = getClientByUserId(partnerId);
    if (partnerClient != null && partnerClient.isChannelOpen()) {
        partnerClient.sendEvent("chat:typing", new TypingResponse(roomId));
    }
}
```

---

## Request/Response DTO

### TypingRequest (수신)
```java
public class TypingRequest {
    private Long roomId;
}
```

### TypingResponse (발송)
```java
public class TypingResponse {
    private Long roomId;
    // senderId 포함 여부는 선택 (프론트는 없어도 동작)
}
```

---

## 프론트엔드 동작 방식 (참고)

```typescript
// 입력 시 emit (2초 쓰로틀)
socket.emit("chat:typing", { roomId });

// 수신 시 처리
socket.on("chat:typing", (data: { roomId: number }) => {
  if (data.roomId !== roomId) return;
  setPartnerTyping(true);               // "입력 중..." 표시
  setTimeout(() => setPartnerTyping(false), 3000); // 3초 후 자동 제거
});
```

- 클라이언트는 2초에 한 번만 emit → 서버 부하 미미
- 수신 3초 후 자동으로 인디케이터 제거 (stop 이벤트 불필요)

---

## 친구 온라인 초기 상태 — 별도 요청

> **우선순위**: 🟡 Medium

앱 시작 시 이미 접속 중인 친구들의 온라인 상태를 알 수 없습니다.
현재는 `friend:status-change` 이벤트가 발생할 때만 온라인 점이 표시됩니다.

### 요청: 소켓 연결 시 친구 온라인 상태 일괄 전송

**방법 A** — 서버가 연결 시 자동 push:
```
클라이언트 connect → 서버가 현재 온라인인 친구 목록을 아래 이벤트로 전송
```

**방법 B** — REST API 추가:
```
GET /friends/online → [{ userId: number, isOnline: boolean }]
```

**프론트 처리 (방법 A 기준)**:
```typescript
// 기존 friend:status-change 핸들러가 이미 있어서 추가 작업 불필요
// 서버에서 connect 시점에 friend:status-change를 여러 번 emit만 하면 됨
```

방법 A가 구현이 더 간단하며 권장합니다.

---

## 체크리스트

- [ ] `chat:typing` 이벤트 수신 핸들러 추가
- [ ] 채팅방 상대방에게 relay 로직 구현
- [ ] 자기 자신 제외 처리
- [ ] (선택) 친구 소켓 connect 시 온라인 상태 일괄 push
