# 백엔드 작업 지시 — chat:receive echo + 채팅 이미지 전송

> **요청일**: 2026-03-25
> **우선순위**: ① echo 🔴 High  ② 이미지 🟢 Low
> **관련 파일**: `src/screens/ChatScreen.tsx`, `src/api/chat.ts`

---

## ① chat:receive sender echo 전송 🔴 High

### 문제
현재 `chat:send` 처리 시 **메시지를 보낸 본인**에게 `chat:receive`가 오지 않습니다.
프론트에서 4초 폴링으로 임시 대응 중이며, echo 구현 시 폴링이 제거되어
배터리·네트워크 사용량이 크게 줄어듭니다.

### 요청 작업

`chat:send` 이벤트 처리 후 **송신자 포함** 채팅방 양쪽 모두에게 `chat:receive` emit

```
현재: A 전송 → B에게만 chat:receive
필요: A 전송 → A, B 모두에게 chat:receive
```

### chat:receive payload (기존과 동일)

```json
{
  "roomId": 42,
  "message": {
    "id": 1001,
    "senderId": 7,
    "content": "안녕하세요",
    "createdAt": "2026-03-25T10:30:00Z"
  }
}
```

### 구현 예시 (기존 코드 참고)

```java
@OnEvent("chat:send")
public void onChatSend(SocketIOClient client, ChatSendRequest request) {
    Long senderId = getUserIdFromClient(client);
    ChatMessage saved = chatService.saveMessage(request.getRoomId(), senderId, request.getContent());

    ChatReceiveResponse response = new ChatReceiveResponse(request.getRoomId(), saved);

    // 기존: 상대방에게만 emit
    // 수정: 송신자 포함 양쪽 모두 emit
    broadcastToRoom(request.getRoomId(), "chat:receive", response); // 송신자 포함
}
```

> ⚠️ 프론트는 이미 자기 자신의 echo를 처리하는 로직이 있습니다.
> `senderId === myUserId`인 경우 temp 메시지를 confirmed 메시지로 교체합니다.
> 별도 처리 없이 그냥 emit만 해주시면 됩니다.

---

## ② 채팅 이미지 전송 🟢 Low

### 개요

채팅에서 텍스트 외에 이미지를 전송할 수 있는 기능입니다.

### 필요한 변경

#### A. REST API — 이미지 업로드

```
POST /chat/rooms/{roomId}/messages/image
Content-Type: multipart/form-data
  - part: "image" (jpeg/png/webp, 최대 10MB)
Authorization: Bearer <token>
```

**Response (기존 ChatMessage 확장)**:
```json
{
  "success": true,
  "data": {
    "id": 1002,
    "senderId": 7,
    "content": null,
    "imageUrl": "https://cdn.connecto.app/chat/rooms/42/img_abc.jpg",
    "messageType": "IMAGE",
    "createdAt": "2026-03-25T10:31:00Z"
  }
}
```

#### B. 기존 ChatMessage 타입 확장

기존 메시지 조회 API (`GET /chat/rooms/{roomId}/messages`) 응답에도 동일하게 적용:

```json
{
  "id": 1002,
  "senderId": 7,
  "content": null,
  "imageUrl": "https://cdn.connecto.app/...",
  "messageType": "IMAGE",
  "createdAt": "2026-03-25T10:31:00Z"
}
```

텍스트 메시지는 기존 그대로:
```json
{
  "id": 1001,
  "senderId": 7,
  "content": "안녕하세요",
  "imageUrl": null,
  "messageType": "TEXT",
  "createdAt": "2026-03-25T10:30:00Z"
}
```

> `messageType` 필드 없이 `imageUrl != null` 로 구분해도 됩니다. 프론트에서 맞춰드리겠습니다.
> 단, `content`는 이미지 메시지일 때 `null` 또는 빈 문자열로 주셔야 합니다.

#### C. Socket.IO — 이미지 메시지 실시간 전달

이미지 업로드 완료 후, 기존 `chat:receive` 이벤트에 `imageUrl` 추가해서 emit:

```json
{
  "roomId": 42,
  "message": {
    "id": 1002,
    "senderId": 7,
    "content": null,
    "imageUrl": "https://cdn.connecto.app/chat/rooms/42/img_abc.jpg",
    "messageType": "IMAGE",
    "createdAt": "2026-03-25T10:31:00Z"
  }
}
```

송신자 포함 양쪽 모두 emit (① echo와 동일 방식).

#### D. ChatRoom lastMessage 처리

`GET /chat/rooms` 응답의 `lastMessage` 필드:
- 이미지 메시지일 때: `"사진"` (또는 `"📷 사진"`) 고정 문자열 권장
- 빈 문자열·null은 프론트에서 "대화를 시작해보세요 👋" 표시되므로 비권장

#### E. S3 저장 경로 권장

```
chat/rooms/{roomId}/{uuid}.{ext}
```

---

## 작업 우선순위 요약

| 순서 | 작업 | 난이도 | 영향 |
|------|------|--------|------|
| 1 | `chat:receive` sender echo | ⭐ 쉬움 (1줄 수정) | 폴링 제거 → 성능 개선 |
| 2 | `POST /chat/rooms/{roomId}/messages/image` | ⭐⭐ 보통 | 이미지 전송 기능 |
| 2 | `ChatMessage` 타입에 `imageUrl`, `messageType` 추가 | ⭐ 쉬움 | 기존 API 확장 |
| 2 | 이미지 메시지 `chat:receive` emit | ⭐ 쉬움 | 실시간 수신 |

① 완료 후 프론트에서 폴링 즉시 제거 예정입니다.
② 이미지 API 완성되면 프론트 구현 시작하겠습니다.
