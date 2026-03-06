# Gap Analysis: webrtc-call

**Date**: 2026-03-06
**Feature**: webrtc-call (WebRTC 통화 플로우 버그 수정)
**Match Rate**: 100%

---

## Plan vs Implementation Comparison

### Bug 1 (Critical): Offerer 충돌 수정
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `setTimeout(() => createOffer(), 500)` 제거 | PASS — 해당 코드 없음 |
| `isOfferer` prop 추가 (`WebRTCHookParams`) | PASS — line 34 |
| `if (isOfferer) { createOffer() }` 로 교체 | PASS — lines 303-307 |
| `isOffererRef.current = true` 조건부 설정 | PASS — line 305 |

### Bug 2 (High): 채널 Room Join 추가
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `socket.emit("webrtc:join", { channelId, sessionId })` | PASS — line 251 |
| PeerConnection 초기화 전에 join emit | PASS — join이 initializePeerConnection 앞 |

### Bug 3 (High): POST /match/start REST 선행 호출
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `await apiClient.post("/match/start")` 추가 | PASS — lines 62-68 |
| 실패 시 error 설정 + 조기 리턴 | PASS — setError + setStatus("idle") + return |
| 성공 후 소켓 이벤트 대기 (기존 흐름 유지) | PASS |

### Gap 1 (Medium): TURN 서버 조건부 설정
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `EXPO_PUBLIC_TURN_URL` 환경변수 참조 | PASS — line 60 |
| TURN 없으면 STUN only (기존 동작 유지) | PASS — spread 조건부 |
| username/credential 환경변수 | PASS — lines 67-68 |

### Gap 2 (Low): CallScreen 재연결 버튼
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `startConnection`, `cleanup` 반환 | PASS — `useWebRTC` return에 포함 |
| `webrtcError` 시 재연결 버튼 표시 | PASS — `CallScreen.tsx` |
| `onPress` → `cleanup() + startConnection()` | PASS |

### 타입 전파 (types.ts + MatchingScreen)
**Status**: PASS (100%)

| 세부 항목 | 결과 |
|-----------|------|
| `RootStackParamList.Call`에 `isOfferer: boolean` | PASS |
| `CallScreenRouteProp.params`에 `isOfferer: boolean` | PASS |
| `MatchResult` 타입에 `isOfferer: boolean` | PASS |
| `MatchingScreen` → `navigation.replace("Call", { isOfferer })` | PASS |
| 폴링 fallback에 `isOfferer: false` 기본값 | PASS |

---

## TypeScript 검증

```
npx tsc --noEmit → 0 errors
```

---

## Gaps

없음. 모든 Plan/Design 목표가 달성되었습니다.

---

## 잔여 백엔드 의존성 (프론트 범위 외)

| 항목 | 내용 | 상태 |
|------|------|------|
| `match:success` 이벤트에 `isOfferer` 포함 | 서버가 한 쪽 true, 다른 쪽 false 전달 | 백엔드 협의 필요 |
| `webrtc:join` 이벤트 서버 처리 | 서버가 channelId 룸에 소켓 추가 | 백엔드 확인 필요 |
| TURN 서버 URL | 실기기 NAT 통과 | 선택사항 |

---

## Summary

| 항목 | 결과 |
|------|------|
| Offerer 충돌 수정 | PASS |
| 채널 Room Join | PASS |
| POST /match/start 선행 호출 | PASS |
| TURN 서버 조건부 설정 | PASS |
| 재연결 버튼 UI | PASS |
| 타입 전파 (5개 파일) | PASS |
| TypeScript 타입 안전성 | PASS (0 errors) |
| **Match Rate** | **100%** |
