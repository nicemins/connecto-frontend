# Chat Feature — Gap Analysis Report

> **Analysis Type**: Gap Analysis (PDCA Check Phase)
> **Project**: Connecto
> **Date**: 2026-03-18
> **Design Source**: CLAUDE.md Sections 6.10, 7, 8.6, 9
> **Analyst**: gap-detector

---

## Match Rate: 98% ✅

| Category | Items | Matching | Rate |
|----------|:-----:|:--------:|:----:|
| REST API endpoints | 3 | 3 | 100% |
| REST API types | 3 | 3 | 100% |
| Socket events | 4 | 4 | 100% |
| Business logic requirements | 6 | 6 | 100% |
| Navigation spec | 4 | 4 | 100% |
| Code quality fixes | 12 | 12 | 100% |
| **Total** | **32** | **32** | **100%** |

*-2% deduction: tab route naming inconsistency ("FriendList" renders ChatListScreen)*

---

## ✅ Implemented (matching spec)

### REST API (chat.ts)
- `POST /chat/rooms` → `createChatRoom(friendId)` ✅
- `GET /chat/rooms` → `getChatRooms()` returns `ChatRoom[]` ✅
- `GET /chat/rooms/{roomId}/messages` → `getChatMessages(roomId, page, size)` with Axios `params` object ✅
- `ChatRoom`, `ChatMessage`, `ChatMessagesResponse` types — exact match ✅

### Socket Events
- emit `chat:send` `{ roomId: number, content: string }` ✅
- on `chat:receive` `{ roomId: number, message: ChatMessage }` ✅
- on `chat:error` `{ message: string }` → Alert 표시 ✅
- No `chat:join` emit (userId-based direct emit, not rooms) ✅

### Business Logic
- `POST /chat/rooms` → 채팅방 생성/조회 후 Chat 화면 이동 ✅
- 실시간 `chat:send`/`chat:receive` 소켓 ✅
- 4초 폴링 fallback (에뮬레이터 불안정 대응) ✅
- AppState listener — 백그라운드 시 폴링 중지, 포그라운드 시 재시작 ✅
- 메시지 히스토리 페이징 (handleScroll offset < 80) ✅
- 폴링 시 temp 메시지(음수 ID) 제거하지 않음 ✅

### Navigation
- `Chat { roomId: number, friendNickname: string, friendProfileImageUrl?: string }` ✅
- RootNavigator에 Chat 스크린 등록 ✅
- ChatListScreen → Chat 정상 이동 ✅
- ChatListScreen — MainTabs "FriendList" 탭에서 접근 가능 ✅

### Code Quality Fixes (code review 결과 적용)
- `getChatMessages` Axios `params` 객체 사용 (URL 문자열 삽입 제거) ✅
- `socket.ts` SOCKET_URL 에 죽은 `.replace("/api/v1", "")` 제거 ✅
- `ListHeader` 컴포넌트 함수 외부 정의 (리렌더 시 remount 방지) ✅
- `AvatarView` 헬퍼 추출 (모달 2곳 중복 코드 제거) ✅
- `formatTime` Invalid Date 방어 (`isNaN` 체크) ✅
- `handleAccept` loadData() 제거 (낙관적 업데이트만 사용) ✅
- 소켓 `connect` 이벤트 리스너 추가 (재연결 시 누락 메시지 복원) ✅
- `pendingQueueRef` (배열) 로 에코 매칭 (동일 메시지 연속 전송 정확도) ✅
- `isSendingRef` (ref) + `isSending` (state) 이중 전송 방지 ✅
- 폴링이 temp 메시지 삭제하지 않음 ✅
- `handleScroll` 페이지네이션 트리거 (onEndReached 제거) ✅
- `KeyboardAvoidingView` FlatList + 입력창 함께 감싸기 ✅

---

## ⚠️ Minor Findings

### 1. Tab Route Naming Inconsistency
- **위치**: `src/navigation/MainTabNavigator.tsx`, `src/navigation/types.ts`
- **내용**: `MainTabParamList`의 탭 이름이 `"FriendList"`이지만 실제 렌더링되는 컴포넌트는 `ChatListScreen` (탭 레이블: "채팅")
- **영향**: 기능상 문제 없음. 명명 불일치만 존재
- **권장**: 탭 이름을 `"ChatList"`로 변경하거나 주석으로 명시 (Breaking change이므로 별도 작업)

### 2. CLAUDE.md 문서 동기화 (코드 변경 불필요)

| 섹션 | 이슈 | 조치 |
|------|------|------|
| 4.1 파일 구조 | `socket.ts` exports에 `connectSocket` 표기 | `getSocket`으로 수정 ✅ (이미 반영) |
| 6.8 친구/신고 | `DELETE /friends/{friendshipId}`, `POST /friends/{friendshipId}/block` 미문서화 | 추가 필요 |

---

## ❌ Gaps Found

없음 — 모든 spec 항목 구현 완료.

---

## Summary

채팅 기능은 CLAUDE.md 스펙과 **98% 일치**합니다. REST API 3개, 소켓 이벤트 4개, 비즈니스 로직 6개, 네비게이션 4개, 코드 품질 수정 12개 — 총 32개 항목 모두 통과. 코드 수정은 필요 없으며, CLAUDE.md 문서 업데이트 (Section 6.8 친구 관리 API 추가)만 권장합니다.

---

**분석 대상 파일:**
- `src/api/chat.ts` — REST API
- `src/screens/ChatScreen.tsx` — 채팅 화면
- `src/screens/ChatListScreen.tsx` — 채팅방 목록
- `src/api/socket.ts` — 소켓 싱글톤
- `src/navigation/types.ts` — 라우트 타입
- `src/navigation/RootNavigator.tsx` — 스택 네비게이터
- `src/navigation/MainTabNavigator.tsx` — 탭 네비게이터
- `src/api/friends.ts` — 친구 API
