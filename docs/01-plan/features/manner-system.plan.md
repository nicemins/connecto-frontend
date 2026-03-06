# Plan: manner-system

## Overview
신고 시스템(Manner System) 완성 및 MatchResultScreen 레퍼런스 정렬

## Background
이전 세션에서 구현한 Token Refresh, Match Result API, MyPage 편집 이후 남은 갭:
- `POST /report` → `POST /reports` 엔드포인트 오탈자
- `src/api/match.ts` 파일 부재 (레퍼런스는 별도 파일, 현재는 `call.ts`에 혼재)
- `MatchResultScreen.tsx`가 `partnerProfile` 상태 미사용 (상대 닉네임 미표시)
- 신고 시 사유 선택 UI 부재

## Goals
1. `src/api/match.ts` 생성 — `getMatchResult` + `MatchResultData` 타입 이전
2. `src/api/report.ts` 수정 — 엔드포인트 `/report` → `/reports`
3. `src/screens/MatchResultScreen.tsx` 업데이트:
   - `import from "../api/match"` 사용
   - `partnerProfile` 상태로 상대 닉네임 표시
   - 신고 사유 선택 (욕설·성희롱·스팸·기타)
4. `src/api/call.ts` 정리 — `getMatchResult` 관련 코드 제거

## Scope
- `src/api/match.ts` (신규)
- `src/api/report.ts` (수정)
- `src/api/call.ts` (수정)
- `src/screens/MatchResultScreen.tsx` (수정)

## Out of Scope
- 백엔드 신고 처리 로직
- 관리자 신고 대시보드
- 매너 점수/평가 UI

## Success Criteria
- TypeScript 컴파일 오류 없음
- MatchResultScreen에서 상대 닉네임 정상 표시
- 신고 다이얼로그에 사유 선택지 표시
- API 엔드포인트 `/reports` 정확히 호출
