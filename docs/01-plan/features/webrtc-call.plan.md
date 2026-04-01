# Plan: webrtc-call

## Overview
WebRTC 오디오 통화 플로우 완성 — 매칭 → 통화 → 종료까지 실제 동작하는 구현 확보

## Background

`CallScreen`, `useWebRTC`, `useSocketMatching` 코드가 이미 작성되어 있으나
실제 통화가 성립되지 않는 구조적 버그들이 존재한다.

| 현황 | 상태 |
|------|------|
| `useSocketMatching` — 소켓 + 폴링 하이브리드 매칭 | 구현됨 |
| `useWebRTC` — PeerConnection + 시그널링 훅 | 구현됨 (버그 있음) |
| `CallScreen` — 5분 타이머 + 파동 UI | 구현됨 |
| `MatchingScreen` → `CallScreen` 네비게이션 | 구현됨 |

## 발견된 버그 및 Gap

### Bug 1 (Critical): Offerer 충돌
**위치**: `useWebRTC.ts:293-296`
```ts
// 현재: 양쪽 모두 500ms 후 createOffer() 실행
setTimeout(() => {
  isOffererRef.current = true;
  createOffer();
}, 500);
```
- 두 클라이언트가 동시에 Offer를 생성 → Signaling 충돌 → 연결 실패
- **해결**: 서버가 `match:success` 이벤트에 `isOfferer: boolean` 필드 포함해 지정

### Bug 2 (High): 채널 Room Join 누락
**위치**: `useWebRTC.ts`의 `startConnection()`
- Socket 연결 후 `webrtcChannelId` 룸에 join하지 않음
- 시그널링 메시지가 상대방에게 라우팅되지 않을 수 있음
- **해결**: 시그널링 시작 전 `socket.emit("webrtc:join", { channelId: webrtcChannelId, sessionId })` 추가

### Bug 3 (High): match:start vs POST /match/start 불일치
**위치**: `useSocketMatching.ts:startMatching()`
- 현재 `socket.emit("match:start")`만 호출
- 스펙은 `POST /match/start` REST API 호출 후 소켓 대기
- **해결**: `startMatching()`에서 REST API 먼저 호출 후 소켓 이벤트 수신

### Gap 1 (Medium): TURN 서버 미설정
- Google STUN만 설정 → 모바일 실기기 NAT 통과 실패 가능성 높음
- **해결**: 백엔드에서 제공하는 TURN 서버 정보 사용 (또는 임시 공개 TURN)

### Gap 2 (Low): CallScreen WebRTC 오류 복구 없음
- `webrtcError` 표시만 있고 재연결 버튼 없음
- **해결**: 오류 발생 시 재연결 버튼 표시

## Goals

1. `useSocketMatching.ts` 수정 — `POST /match/start` 호출 후 소켓 이벤트 대기
2. `useWebRTC.ts` 수정:
   - `webrtc:join` emit 추가 (채널 룸 진입)
   - `match:success` 의 `isOfferer` 값으로 Offerer 결정
3. `useSocketMatching.ts` — `MatchResult` 타입에 `isOfferer: boolean` 추가
4. `useWebRTC.ts` — TURN 서버 설정 추가 (환경변수 `EXPO_PUBLIC_TURN_URL`)
5. `CallScreen.tsx` — WebRTC 오류 시 재연결 버튼 UI 추가

## Scope

- `src/hooks/useSocketMatching.ts` (수정)
- `src/hooks/useWebRTC.ts` (수정)
- `src/screens/CallScreen.tsx` (수정)

## Out of Scope

- 백엔드 시그널링 서버 구현
- TURN 서버 직접 구축
- 비디오 통화 지원
- 통화 품질 지표 UI

## Success Criteria

- 두 클라이언트가 `webrtcChannelId`로 룸에 진입
- 서버가 지정한 `isOfferer` 쪽만 Offer 생성
- ICE 연결 상태 `connected` 도달 (실기기 테스트 또는 로컬 2탭 시뮬레이션)
- TypeScript 컴파일 오류 없음

## Socket 이벤트 명세 (프론트 기준)

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `match:success` | server→client | `{ sessionId, webrtcChannelId, isOfferer }` | 매칭 성공 |
| `webrtc:join` | client→server | `{ channelId, sessionId }` | 통화 채널 룸 진입 |
| `webrtc:offer` | client→server | `{ sdp, to, sessionId }` | Offer 전송 |
| `webrtc:answer` | client→server | `{ sdp, to, sessionId }` | Answer 전송 |
| `webrtc:ice` | client→server | `{ candidate, to, sessionId }` | ICE Candidate 전송 |
