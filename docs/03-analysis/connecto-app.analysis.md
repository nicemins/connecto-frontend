# Gap Analysis — connecto-app

**분석일**: 2026-03-26
**Overall Match Rate**: 95% ✅

---

## 요약

| 영역 | Match Rate | 상태 |
|------|:----------:|:----:|
| chat-image (Design vs Impl) | 98% | ✅ PASS |
| block-list (Design vs Impl) | 95% | ✅ PASS |
| chat:join 룸 기반 라우팅 | 100% | ✅ PASS |
| 통화 거절 처리 | 100% | ✅ PASS |
| ChatList 독립 탭 | 100% | ✅ PASS |
| 친구 온라인 상태 전역화 | 100% | ✅ PASS |
| WebRTC offer 버퍼링 | 100% | ✅ PASS |
| **Overall** | **95%** | **✅ PASS** |

---

## 1. chat-image — 98%

| 항목 | 결과 |
|------|:----:|
| ChatMessage type (imageUrl, messageType) | ✅ |
| sendChatImage (POST multipart, part "image") | ✅ |
| isImageSending state + ref | ✅ |
| handleSendImage (ImagePicker → 5MB → temp → REST → replace) | ✅ |
| renderMessage IMAGE 분기 | ✅ |
| 이미지 버블 200x150, borderRadius 12 | ✅ |
| isPending ActivityIndicator overlay | ✅ |
| dedup: `prev.some(m => m.id === msg.id)` | ✅ |
| UI: [camera][TextInput][send] | ✅ |

미세 차이: 카메라 버튼에 업로드 중 ActivityIndicator 추가 (설계 개선)

---

## 2. block-list — 95%

| 항목 | 결과 |
|------|:----:|
| BlockedUser type 4개 필드 | ✅ |
| getBlockedUsers() → GET /users/me/blocks | ✅ |
| unblockUser() 재사용 | ✅ |
| RootStackParamList BlockList 등록 | ✅ |
| 3-way 렌더링 (로딩/비어있음/목록) | ✅ |
| MyPageScreen 진입점 | ✅ |

미세 차이: 차단 해제 시 Alert.alert 확인 다이얼로그 추가 (UX 개선), 아바타 44px (설계 40px)

---

## 3. chat:join 룸 기반 라우팅 — 100%

| 항목 | 위치 |
|------|------|
| mount 시 `chat:join { roomId }` emit | `ChatScreen.tsx:125` |
| unmount 시 `chat:leave { roomId }` emit | `ChatScreen.tsx:131` |
| 재연결 시 자동 rejoin | `ChatScreen.tsx:128` |
| 백엔드 `socket.join("chat:" + roomId)` 확인 | `ChatSocketHandler.java:64` |
| 백엔드 룸 브로드캐스트 확인 | `ChatSocketHandler.java:105-108` |

---

## 4. 통화 거절 — 100%

| 항목 | 위치 |
|------|------|
| `rejectCall(sessionId)` POST /call/reject/{sessionId} | `call.ts:29-34` |
| IncomingCallModal fire-and-forget | `IncomingCallModal.tsx:32-34` |
| CallScreen `call:rejected` 소켓 핸들러 | `CallScreen.tsx:158-179` |
| sessionId 가드 | `CallScreen.tsx:163` |
| isEndingRef race condition 방지 | `CallScreen.tsx:165-166` |
| 타이머 정리 후 goBack | `CallScreen.tsx:167-169` |

---

## 5. ChatList 독립 탭 — 100%

| 항목 | 위치 |
|------|------|
| 4개 탭: Home→FriendList→ChatList→MyPage | `MainTabNavigator.tsx:47-87` |
| MainTabParamList에 ChatList 포함 | `types.ts:30` |
| ChatListScreen import | `MainTabNavigator.tsx:8` |

---

## 6. 친구 온라인 상태 전역화 — 100%

| 항목 | 위치 |
|------|------|
| `friendOnlineStatus` + `updateFriendOnline` in store | `authStore.ts:15,34` |
| `useIncomingCall`에서 `friend:status-change` 전역 수집 | `useIncomingCall.ts:31-33` |
| ChatListScreen 스토어 읽기 | `ChatListScreen.tsx:164` |
| FriendListScreen 스토어 읽기 | `FriendListScreen.tsx:51` |

---

## 7. WebRTC offer 버퍼링 — 100%

| 항목 | 위치 |
|------|------|
| `pendingOfferRef` 선언 | `useWebRTC.ts:70` |
| `webrtc:offer` 리스너 PC 초기화 전 등록 | `useWebRTC.ts:258` |
| PC 준비 전 offer 버퍼링 | `useWebRTC.ts:259-262` |
| PC+stream 초기화 후 버퍼 처리 | `useWebRTC.ts:282-290` |

---

## 수정 완료 항목

| 항목 | 조치 |
|------|------|
| CLAUDE.md Section 8.6 `(chat:join 불필요)` 제거 | ✅ 수정 |
| CLAUDE.md Section 7 소켓 테이블 `chat:join`/`chat:leave` 추가 | ✅ 수정 |
| CLAUDE.md Section 9 `채팅 REST fallback` → `채팅 룸 기반 라우팅`으로 교체 | ✅ 수정 |
| `ChatScreen.tsx` 타이핑 쓰로틀 주석 "2초" → "1초" | ✅ 수정 |
