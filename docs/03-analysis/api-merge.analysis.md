# Gap Analysis: api-merge

**Date**: 2026-03-06
**Feature**: api-merge (Desktop 레포 → 메인 레포 병합)
**Match Rate**: 100%

---

## Plan vs Implementation Comparison

### Goal 1: `src/api/languages.ts` 신규 생성
**Status**: PASS (100%)

- `saveLanguage(data: LanguageRequest)` — `POST /users/me/languages` ✅
- `saveInterests(interests: string[])` — `POST /users/me/interests` ✅
- `LanguageType`, `LanguageLevel`, `LanguageRequest` 타입 정의 ✅

### Goal 2: `src/api/match.ts` 스펙 일치 교체
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `MatchResultData.profile` (`id, nickname, profileImageUrl?, bio?`) | PASS |
| `MatchResultData.wantAgain: boolean` | PASS |
| `getMatchResult(sessionId: number)` — number 타입 | PASS |
| 구 `partnerId`, `partnerNickname`, `totalTime` 필드 제거 | PASS |

### Goal 3: `src/api/profile.ts` 함수 추가
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `createProfile()` — `POST /users/me/profile` | PASS |
| `getMyProfile()` — `GET /users/me/profile` | PASS |
| `checkNicknameAvailable()` — `GET /profiles/exists` | PASS |
| `updateProfile()`, `updateProfileImage()` 기존 함수 유지 | PASS |
| `CreateProfileRequest`, `ProfileResponse` 타입 추가 | PASS |

### Goal 4: `src/api/call.ts` sessionId number 통일
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `endCall(sessionId: number)` | PASS |
| `callAgain(sessionId: number, wantAgain: boolean)` | PASS |
| `CallEndRequest.sessionId: number` | PASS |
| `CallAgainRequest.sessionId: number` | PASS |

### Goal 5: `src/screens/InterestsSetupScreen.tsx` 신규 생성
**Status**: PASS (100%)

- 15개 관심사 chip 선택 UI ✅
- `saveInterests()` 연동 ✅
- `navigation.replace("MainTabs")` 완료 처리 ✅
- 건너뛰기 (0개 선택) 지원 ✅

### Goal 6: `src/navigation/types.ts` 수정
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `InterestsSetup: undefined` 라우트 추가 | PASS |
| `Call.sessionId: number` | PASS |
| `Call.isOfferer: boolean` 유지 | PASS |

### Goal 7: `src/navigation/RootNavigator.tsx` InterestsSetup 등록
**Status**: PASS (100%)

- `InterestsSetupScreen` import 추가 ✅
- `<Stack.Screen name="InterestsSetup" component={InterestsSetupScreen} />` 등록 ✅

### Goal 8: `src/screens/CallScreen.tsx` sessionId 타입 맞춤
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `params.sessionId: number` | PASS |
| `endCall(sessionId)` — number 그대로 전달 | PASS |
| `getMatchResult(sessionId)` — number 그대로 전달 | PASS |
| `matchResult.profile.id` → `partnerId` 변환 | PASS |
| `parseInt()` 불필요 코드 제거 | PASS |

### Goal 9: `src/screens/MatchResultScreen.tsx` 새 구조 반영
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `resolvedPartnerId` → `partnerProfile?.profile?.id` | PASS |
| `callAgain(sessionId, true)` — number 직접 전달 | PASS |
| `partnerNickname` → `partnerProfile?.profile?.nickname` | PASS |

### Goal 10: useSocketMatching/useWebRTC sessionId number 통일
**Status**: PASS (100%)

| 항목 | 결과 |
|------|------|
| `MatchResult.sessionId: number` | PASS |
| 폴링 응답 `sessionId?: number` | PASS |
| `useWebRTC.WebRTCHookParams.sessionId: number` | PASS |

---

## TypeScript 검증

```
npx tsc --noEmit → 0 errors
```

---

## Gaps

없음. 모든 Plan 목표 달성.

---

## 변경 파일 목록 (최종)

| 파일 | 변경 유형 |
|------|-----------|
| `src/api/languages.ts` | 신규 |
| `src/api/match.ts` | 교체 (MatchResultData 구조 변경) |
| `src/api/profile.ts` | 수정 (createProfile, getMyProfile, checkNickname 추가) |
| `src/api/call.ts` | 수정 (sessionId string → number) |
| `src/screens/InterestsSetupScreen.tsx` | 신규 |
| `src/navigation/types.ts` | 수정 (InterestsSetup 추가, Call.sessionId number) |
| `src/navigation/RootNavigator.tsx` | 수정 (InterestsSetup 등록) |
| `src/screens/CallScreen.tsx` | 수정 (sessionId number, matchResult.profile 참조) |
| `src/screens/MatchResultScreen.tsx` | 수정 (새 MatchResultData 구조 반영) |
| `src/hooks/useSocketMatching.ts` | 수정 (sessionId number) |
| `src/hooks/useWebRTC.ts` | 수정 (sessionId number) |

---

## Summary

| 항목 | 결과 |
|------|------|
| API 파일 스펙 일치율 | 100% |
| 타입 일관성 (sessionId: number 전체) | PASS |
| 신규 화면/파일 추가 | PASS |
| TypeScript 컴파일 | PASS (0 errors) |
| Desktop 레포 우위 항목 흡수 | PASS |
| 우리 레포 WebRTC/매칭 개선사항 유지 | PASS |
| **Match Rate** | **100%** |
