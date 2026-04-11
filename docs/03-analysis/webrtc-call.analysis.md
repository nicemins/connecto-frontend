# Gap Analysis — webrtc-call (재검증)

**설계 기준**: `docs/02-design/features/webrtc-call.design.md` (2026-03-06)
**분석 대상**: 커밋 1443b8f (peer-ready 리팩터링) 이후 현재 상태
**분석일**: 2026-04-11
**Overall Match Rate**: 95% ✅

---

## 요약

| 영역 | 결과 |
|------|:----:|
| 설계 필수 항목 (8개) | ✅ 8/8 |
| 설계 초과 구현 | 3개 (개선) |
| 백엔드 의존 확인 필요 | 2개 ⚠️ |
| **Overall Match Rate** | **95%** |

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

## 잔여 이슈 (백엔드 의존)

| ID | 항목 | 상태 | 비고 |
|----|------|:----:|------|
| W-1 | `webrtc:peer-ready` 서버 구현 | ⚠️ 미확인 | 두 번째 peer가 `webrtc:join` emit 시 서버가 채널에 broadcast 필요 |
| W-2 | `match:success` payload에 `isOfferer` 포함 | ⚠️ 미확인 | MEMORY(2026-03-06): 미포함 / CLAUDE.md: 포함 — 서버 동작 재확인 필요 |

### W-2 리스크 상세

REST `matched=false` 경로(소켓 대기)에서 서버가 `isOfferer` 필드를 포함하지 않으면:
- `MatchSuccessPayload.isOfferer` = `undefined` → falsy → 양쪽 모두 answerer
- 결과: offer가 생성되지 않아 WebRTC 연결 불가

**확인 방법**: 에뮬레이터 2대 동시 매칭 후 `match:success` payload 로그 확인.
