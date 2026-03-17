# Plan: api-merge

## Overview
Desktop 레포(`connecto-frontend`)의 API/화면을 `C:\connecto-app`(메인 레포)에 병합
Desktop 우위 항목을 가져오고, 우리의 WebRTC/매칭 개선사항은 유지

## 병합 전략

| 파일 | 출처 | 이유 |
|------|------|------|
| `src/api/languages.ts` | Desktop (신규) | 우리 레포에 없음 |
| `src/api/match.ts` | Desktop | 스펙 일치 (profile+wantAgain 구조) |
| `src/api/profile.ts` | Desktop | createProfile, getMyProfile, checkNickname 추가 |
| `src/api/call.ts` | Desktop | sessionId number 타입, wantAgain 파라미터 정확 |
| `src/screens/InterestsSetupScreen.tsx` | Desktop (신규) | 우리 레포에 없음 |
| `src/navigation/types.ts` | 병합 | InterestsSetup 추가 + isOfferer 유지 |
| `src/navigation/RootNavigator.tsx` | 수정 | InterestsSetup 화면 등록 |
| `src/hooks/useWebRTC.ts` | 우리 유지 | Offerer 충돌 수정, TURN, webrtc:join |
| `src/hooks/useSocketMatching.ts` | 우리 유지 | POST /match/start, isOfferer |
| `src/screens/CallScreen.tsx` | 수정 | sessionId string→number 타입 맞춤 |
| `src/screens/MatchResultScreen.tsx` | 수정 | MatchResultData 새 구조 반영 |

## Goals

1. `src/api/languages.ts` 생성 (Desktop 복사)
2. `src/api/match.ts` 교체 — `MatchResultData: { profile, wantAgain }` 구조로
3. `src/api/profile.ts` 교체 — createProfile, getMyProfile, checkNickname 추가
4. `src/api/call.ts` 교체 — sessionId를 `number`로, wantAgain 파라미터 정확히
5. `src/screens/InterestsSetupScreen.tsx` 생성 (Desktop 복사)
6. `src/navigation/types.ts` 수정 — InterestsSetup 추가, Call.sessionId → number, isOfferer 유지
7. `src/navigation/RootNavigator.tsx` 수정 — InterestsSetup 등록
8. `src/screens/CallScreen.tsx` 수정 — sessionId 타입 number로 맞춤
9. `src/screens/MatchResultScreen.tsx` 수정 — 새 MatchResultData 구조 반영
10. `npx tsc --noEmit` → 0 errors

## Out of Scope
- useWebRTC, useSocketMatching 변경 없음
- HomeScreen, LoginScreen 등 동일한 파일 변경 없음
