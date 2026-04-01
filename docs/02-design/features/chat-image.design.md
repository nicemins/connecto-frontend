# Design — chat-image

> Plan: `docs/01-plan/features/chat-image.plan.md`
> 작성일: 2026-03-25

---

## 변경 파일 목록

| 파일 | 변경 종류 |
|------|----------|
| `src/api/chat.ts` | ChatMessage 타입 확장, sendChatImage 함수 추가 |
| `src/screens/ChatScreen.tsx` | 이미지 버튼, 전송 핸들러, 이미지 버블 렌더링, echo dedup |

---

## 1. `src/api/chat.ts`

### ChatMessage 타입 확장
```typescript
export type ChatMessage = {
  id: number;
  senderId: number;
  content: string | null;          // 이미지 메시지는 null
  imageUrl?: string | null;        // 신규
  messageType?: "TEXT" | "IMAGE";  // 신규
  createdAt: string;
};
```

### sendChatImage 함수
```typescript
POST /chat/rooms/{roomId}/messages/image
multipart/form-data  part: "image"
5MB 이하 / JPEG·PNG·WEBP
→ ChatMessage (imageUrl, messageType: "IMAGE")
```

---

## 2. `src/screens/ChatScreen.tsx`

### 신규 state / ref
```
isImageSending: boolean (state — 버튼 disabled용)
isImageSendingRef: boolean (ref — 중복 전송 방지)
```

### handleSendImage 흐름
```
ImagePicker.launchImageLibraryAsync
  → 취소 시 return
  → fileSize > 5MB → Alert
  → tempMsg(id: -(Date.now()), imageUrl: localUri, messageType: "IMAGE") 추가
  → setIsImageSending(true)
  → sendChatImage(roomId, uri)
      성공: temp를 confirmed로 교체 (id·imageUrl·createdAt 업데이트)
      실패: temp 제거 + Alert
  → setIsImageSending(false)
```

### renderMessage 분기
```
messageType === "IMAGE" || !!imageUrl
  → Image 컴포넌트 (200×150, borderRadius 12)
  → isPending: ActivityIndicator overlay
  → 시간 표시: isPending ? "전송 중..." : HH:MM
else
  → 기존 Text bubble
```

### 소켓 echo dedup
```
handleReceive에서 메시지 추가 시:
  prev.some(m => m.id === msg.id) → 이미 존재하면 skip
이유: 이미지는 REST로 확정 후 소켓 echo가 오면 중복 방지
```

### UI 변경
```
입력창 Row: [📷 버튼] [TextInput] [↑ 버튼]
📷 버튼: 이미지 전송 중이거나 텍스트 전송 중이면 disabled
```

---

## 3. ChatListScreen — 변경 없음
백엔드가 이미지 메시지의 lastMessage를 "사진" 고정으로 전송.
기존 `lastMessage` 표시 로직이 그대로 처리.

---

## 의존성
- `expo-image-picker` — Expo SDK 54 내장, 별도 설치 불필요
- 권한: Android `READ_MEDIA_IMAGES` (app.json에 이미 포함 여부 확인 필요)
