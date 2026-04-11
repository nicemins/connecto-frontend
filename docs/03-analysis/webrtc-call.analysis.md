# Gap Analysis — webrtc-call (재검증)

**설계 기준**: `docs/02-design/features/webrtc-call.design.md` (2026-03-06)
**분석 대상**: 커밋 1443b8f (peer-ready 리팩터링) 이후 현재 상태
**분석일**: 2026-04-11
**Overall Match Rate**: 100% ✅

---

## 요약

| 영역 | 결과 |
|------|:----:|
| 설계 필수 항목 (8개) | ✅ 8/8 |
| 설계 초과 구현 | 3개 (개선) |
| 백엔드 의존 확인 필요 | 0개 (2개 → 모두 해소) |
| **Overall Match Rate** | **100%** |

---

## SC 검증

| 항목 | 설계 | 구현 | 상태 |
|------|------|------|:----:|
| `MatchResult.isOfferer` 타입 | `boolean` 추가 | `useSocketMatching.ts:9` | ✅ |
| `sessionId` 타입 | `string` | `number` (CLAUDE.md 규칙, 의도적) | ✅ |
| REST `/match/start` 선행 호출 | 소켓 전 REST 먼저 | `useSocketMatching.ts:64-89` | ✅ |
| `socket.emit("webrtc:join")` | PC 초기화 전 emit | `useWebRTC.ts:268` (join → PC init 순서 보장) | ✅ |
| `isOfferer` → `createOffer()` 분기 | if문 직접 분기 | `useWebRTC.ts:335-348` (peer-ready wait 후 분기) | ✅ |
| TURN 서버 설정 | env var 직접 참조 | `getTurnCredentials()` API (SEC-H1 개선) | ✅ |
| `CallScreen` `isOfferer` prop 수신 | route.params 수신 | `CallScreen.tsx:133,155` | ✅ |
| 재연결 버튼 (`webrtcError` 시) | 에러 시 UI 제공 | `CallScreen.tsx:175-185` | ✅ |

---

## 설계 초과 구현 (Improvement)

| 추가 항목 | 위치 | 효과 |
|-----------|------|------|
| `webrtc:peer-ready` wait (10s timeout) | `useWebRTC.ts:260-344` | 3s delay/polling 완전 제거, 이벤트 기반 동기화 |
| `pendingOfferRef` offer 버퍼링 | `useWebRTC.ts:270-303` | Answerer PC 초기화 전 offer 도착 race condition 방지 |
| `match:error` / `disconnect` Alert | `useSocketMatching.ts:49-61` | 매칭 중 오류 사용자 피드백 강화 |

---

## 백엔드 확인 결과 (2026-04-11)

| ID | 항목 | 상태 | 확인 내용 |
|----|------|:----:|-----------|
| W-1 | `webrtc:peer-ready` 서버 구현 | ✅ 해소 | `MatchSocketHandler.java:348-373` — channelRoomMap size >= 2 시 room 전체 broadcast |
| W-2 | `match:success` payload에 `isOfferer` 포함 | ✅ 해소 | 즉시(L223) · user1(L299) · user2(L314) 모두 true/false 올바르게 전송 |

### 주의사항 (W-1 부가 정보)
- 서버는 `io.in(room)` 대신 `ConcurrentHashMap<String, Set<SocketIOClient>>(channelRoomMap)`으로 직접 관리
- **서버 재시작 또는 소켓 재연결 시 map 초기화** → 재연결 케이스에서 `webrtc:peer-ready`가 발송되지 않을 수 있음
- 재연결 중 WebRTC 연결 실패 시 이 경로를 우선 의심할 것
