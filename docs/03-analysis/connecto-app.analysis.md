# Gap Analysis — connecto-app

**분석일**: 2026-03-31 (최종)
**Overall Match Rate**: 100% ✅

---

## 최종 요약

| 영역 | Match Rate | 상태 |
|------|:----------:|:----:|
| chat:receive 단일 이벤트 전환 | 100% | ✅ |
| 이미지 dedup (socket → REST race condition) | 100% | ✅ |
| P0 unreadCount 서버 기반 | 100% | ✅ |
| P1 chat:read emit (상대방 메시지만) | 100% | ✅ |
| P1 chat:read on + ✓✓ UI | 100% | ✅ |
| CLAUDE.md 문서 동기화 | 100% | ✅ |
| **Overall** | **100%** | **✅ PASS** |

---

## 세부 검증

### 1. chat:receive 단일 이벤트 전환

| 항목 | 위치 | 결과 |
|------|------|:----:|
| `chat:sent` 핸들러 미존재 | ChatScreen.tsx | ✅ |
| `senderId === myUserId` echo 처리 | ChatScreen.tsx:138 | ✅ |
| `prev.some(m => m.id === msg.id)` dedup | ChatScreen.tsx:162 | ✅ |
| 5초 fallback 미존재 | ChatScreen.tsx | ✅ |
| `pendingTimeoutsRef` 미존재 | ChatScreen.tsx | ✅ |

### 2. 이미지 dedup

| 항목 | 위치 | 결과 |
|------|------|:----:|
| socket 먼저 도착 시 filter(tempId) | ChatScreen.tsx:279 | ✅ |
| REST 먼저 도착 시 map(tempId→sent) | ChatScreen.tsx:280 | ✅ |

### 3. P0 unreadCount 서버 기반

| 항목 | 위치 | 결과 |
|------|------|:----:|
| `ChatRoom.unreadCount: number` 타입 | chat.ts:10 | ✅ |
| AsyncStorage 로컬 추적 제거 | ChatListScreen.tsx | ✅ |
| `chat:receive` → `unreadCount + 1` | ChatListScreen.tsx:219 | ✅ |
| `handleOpenChat` → `unreadCount: 0` | ChatListScreen.tsx:242 | ✅ |
| `renderChatRoom` → `item.unreadCount` | ChatListScreen.tsx:365 | ✅ |

### 4. P1 chat:read emit

| 항목 | 위치 | 결과 |
|------|------|:----:|
| 상대방 메시지 수신 시 emit | ChatScreen.tsx:166-168 | ✅ |
| 내 메시지(echo) 수신 시 미emit | ChatScreen.tsx:166 guard | ✅ |

### 5. P1 chat:read on + ✓✓ UI

| 항목 | 위치 | 결과 |
|------|------|:----:|
| `handleRead` payload 타입 일치 | ChatScreen.tsx:189 | ✅ |
| `Math.max(prev, lastReadMessageId)` | ChatScreen.tsx:191 | ✅ |
| `socket.on/off("chat:read")` cleanup | ChatScreen.tsx:198,204 | ✅ |
| `isRead = isMine && !isPending && id <= partnerLastReadId` | ChatScreen.tsx:305 | ✅ |
| ✓✓ 시간 옆 표시 | ChatScreen.tsx:331 | ✅ |

---

## 수정 이력 (2026-03-31)

| 커밋 | 내용 |
|------|------|
| `a8c3a91` | chat:receive 단일 이벤트 전환 |
| `395e8f4` | 이미지 dedup race condition 수정 |
| `8bb2dc9` | P0 unreadCount 서버 기반 전환 |
| `865e991` | P1 chat:read emit/on + ✓✓ UI |
| `ec6366b` | chat:read emit 가드 수정 + CLAUDE.md 동기화 |
