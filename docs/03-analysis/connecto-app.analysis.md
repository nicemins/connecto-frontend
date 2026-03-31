# Gap Analysis — connecto-app

**분석일**: 2026-03-31
**Overall Match Rate**: 98% ✅

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
| chat:receive 단일 이벤트 전환 | 98% | ✅ PASS |
| **Overall** | **98%** | **✅ PASS** |

---

## chat:receive 단일 이벤트 전환 (2026-03-31) — 98%

### 스펙 vs 구현

| 항목 | 스펙 | 구현 위치 | 결과 |
|------|------|-----------|:----:|
| `chat:sent` 핸들러 | ❌ 제거됨 | 미존재 | ✅ |
| `chat:receive` 발신자 echo 처리 | `senderId === myUserId` 분기 | `ChatScreen.tsx:136` | ✅ |
| `chat:receive` dedup | `prev.some(m => m.id === msg.id)` | `ChatScreen.tsx:168` | ✅ |
| 5초 fallback 타임아웃 | 없어야 함 | 미존재 | ✅ |
| `pendingTimeoutsRef` | 없어야 함 | 미존재 | ✅ |
| `chat:join` emit (mount 시) | ✅ | `ChatScreen.tsx:114` | ✅ |
| `chat:leave` emit (unmount 시) | ✅ | `ChatScreen.tsx:122` | ✅ |
| 재연결 자동 rejoin | ✅ | `ChatScreen.tsx:117` | ✅ |
| `chat:send` emit | ✅ | `ChatScreen.tsx:227` | ✅ |
| `chat:typing` emit (1초 쓰로틀) | ✅ | `ChatScreen.tsx:405` | ✅ |
| `chat:typing` on (3초 hide) | ✅ | `ChatScreen.tsx:181-183` | ✅ |
| `chat:error` on | ✅ | `ChatScreen.tsx:185` | ✅ |

### ⚠️ Minor (−2%, 수정 완료)

CLAUDE.md 구현 현황 테이블에 `chat:sent ACK` stale 참조 → **수정 완료 (2026-03-31)**

---

## 이전 분석 결과 (2026-03-26)

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
