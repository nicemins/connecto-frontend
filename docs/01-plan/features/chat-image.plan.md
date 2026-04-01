# Plan — chat-image

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | chat-image |
| 시작일 | 2026-03-25 |
| 범위 | 채팅 이미지 전송·수신·표시 (프론트엔드) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 채팅에서 텍스트만 보낼 수 있어 표현이 제한됨 |
| Solution | 이미지 첨부 버튼 → 갤러리 선택 → 업로드 → 실시간 표시 |
| Function / UX Effect | 전송 버튼 옆 📷 버튼, 이미지 버블, 전송 중 progress 표시 |
| Core Value | 더 풍부한 대화 경험, 사진으로 감정·상황 즉시 공유 |

---

## 1. 기능 범위

### In Scope
- 이미지 선택 (갤러리, expo-image-picker)
- `POST /chat/rooms/{roomId}/messages/image` 업로드
- 전송 중 이미지 미리보기 bubble (로딩 상태)
- `chat:receive` 수신 시 이미지 bubble 렌더링
- `GET /chat/rooms/{roomId}/messages` 히스토리에서 이미지 표시
- `ChatListScreen` lastMessage "사진" 표시

### Out of Scope
- 비디오 전송
- 이미지 full-screen viewer (탭 확대)  ← Phase 2
- 이미지 저장 기능
- 파일(PDF 등) 전송

---

## 2. API 스펙 (백엔드 완료 대기)

### REST

```
POST /chat/rooms/{roomId}/messages/image
Content-Type: multipart/form-data  (part: "image")
→ 200: ChatMessage { id, senderId, content: null, imageUrl: string, messageType: "IMAGE", createdAt }
```

### ChatMessage 타입 확장

```typescript
export type ChatMessage = {
  id: number;
  senderId: number;
  content: string | null;        // 이미지 메시지는 null
  imageUrl?: string | null;      // 신규 필드
  messageType?: "TEXT" | "IMAGE"; // 신규 필드 (없으면 imageUrl로 구분)
  createdAt: string;
};
```

### Socket

기존 `chat:receive` payload에 `imageUrl`, `messageType` 필드 추가. 별도 이벤트 없음.

---

## 3. 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/api/chat.ts` | `ChatMessage` 타입 확장, `sendChatImage(roomId, uri)` 함수 추가 |
| `src/screens/ChatScreen.tsx` | 📷 버튼 추가, 이미지 bubble 렌더링, 이미지 전송 핸들러 |
| `src/screens/ChatListScreen.tsx` | `lastMessage`가 null이고 이미지 메시지인 경우 "사진" 표시 |

---

## 4. 구현 순서

1. `chat.ts` — `ChatMessage` 타입 확장 + `sendChatImage()` 함수
2. `ChatScreen.tsx` — 이미지 버블 렌더러 (수신 전용, 히스토리 표시)
3. `ChatScreen.tsx` — 📷 버튼 + 전송 핸들러 + 전송 중 버블
4. `ChatListScreen.tsx` — "사진" lastMessage 표시

---

## 5. 의존성

- `expo-image-picker` (Expo SDK 54 포함, 설치 불필요)
- 백엔드 `POST /chat/rooms/{roomId}/messages/image` 완료 후 전송 기능 활성화
- 수신·히스토리 표시는 백엔드 타입 확장 후 즉시 구현 가능

---

## 6. 제약 조건

- 이미지 크기: 5MB 이하 (프론트 검증 기준)
- 허용 포맷: jpeg, png, webp
- 전송 중 중복 전송 방지 (기존 `isSendingRef` 패턴 재사용)
