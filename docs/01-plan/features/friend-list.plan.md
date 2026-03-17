# Plan: friend-list

## Overview
친구 목록 화면 실 API 연동 + 소켓 실시간 온/오프라인 상태 반영

## Background (CLAUDE.md 13장 기준)

| 항목 | 위치 | 상태 |
|------|------|------|
| `getFriendList()` Mock 데이터 사용 | `api/friends.ts` | 백엔드 미구현 |
| `requestCallToFriend()` Mock 데이터 | `api/friends.ts` | 백엔드 미구현 |
| Mock setTimeout 친구 상태 변경 시뮬레이션 | `FriendListScreen.tsx:101-116` | 프로덕션 전 제거 필요 |
| `friend:status-change` 소켓 이벤트 미연결 | `FriendListScreen.tsx` | 미구현 |
| TODO: FriendDetail 모달 | `FriendListScreen.tsx:176` | 미구현 |

## 백엔드 구현 여부 확인 필요

CLAUDE.md 기준 `/friends`, `/friends/request`, `/call/request/{id}` 모두 **백엔드 미구현**.
→ 프론트는 실 API 연동 준비 상태로 만들어두고, Mock → Real 전환을 1줄로 가능하게 구조화.

## Goals

### G1. `src/api/friends.ts` 구조 정리
- `getFriendList()` — Mock 제거 후 실 API 호출 코드 활성화 (`GET /friends`)
- `requestCallToFriend()` — Mock 제거 후 실 API 코드 활성화 (`POST /call/request/{friendId}`)
- 백엔드 준비 안 된 경우: 빈 배열 fallback 처리

### G2. `FriendListScreen.tsx` Mock 코드 제거
- lines 100-127 Mock setTimeout 이벤트 시뮬레이션 완전 제거
- `mockEventTriggeredRef` ref 제거

### G3. 소켓 `friend:status-change` 연동
- `useEffect`에서 `getSocket()` → `socket.on("friend:status-change", handler)` 등록
- 온/오프라인 상태 실시간 반영
- 컴포넌트 언마운트 시 `socket.off("friend:status-change")` 해제

### G4. FriendDetail 모달 (기본)
- 친구 카드 탭 시 간단한 프로필 모달 표시
- 닉네임, 프로필 이미지, 통화 요청 버튼 포함

## 백엔드 미구현 처리 전략

```typescript
// api/friends.ts — 전환 전략
export async function getFriendList(): Promise<FriendListResponse> {
  try {
    const { data } = await apiClient.get<FriendListResponse>("/friends");
    return data;
  } catch (e) {
    // 백엔드 미구현(404/500) 시 빈 목록 반환 (앱 크래시 방지)
    console.warn("[friends] API not ready, returning empty list");
    return { success: true, data: [] };
  }
}
```

## Scope
- `src/api/friends.ts`
- `src/screens/FriendListScreen.tsx`

## Out of Scope
- 백엔드 `/friends` API 구현
- 친구 삭제 기능
- 친구 검색

## Success Criteria
- Mock setTimeout 코드 없음
- `friend:status-change` 소켓 이벤트 수신 시 UI 즉시 반영
- 친구 탭 시 기본 모달 표시
- 백엔드 미준비 시 빈 목록 + 오류 없이 동작
- TypeScript 0 errors

## 우선순위 참고
백엔드 `/friends` API 준비 여부에 따라 실 연동 시점이 달라짐.
현재는 **구조 정리 + Mock 제거 + 소켓 연동** 에 집중.
