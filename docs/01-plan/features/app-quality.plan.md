# app-quality — Plan Document

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | app-quality |
| 시작일 | 2026-03-08 |
| 담당 | Frontend |
| PDCA 단계 | Plan |
| 품질 점수 | 58/100 (분석 기준) |

### Value Delivered (4-Perspective)

| 관점 | 내용 |
|------|------|
| Problem | Silent catch, 타이머 미정리, 소켓 중복 리스너 등 28개 품질 이슈 — 앱 크래시·데이터 불일치 위험 |
| Solution | High 9개 이슈 우선 수정 후 Medium 핵심 항목 개선, CharacterBlob 컴포넌트 추출 |
| Function UX Effect | 에러 Alert 노출, 타이머 정상 종료, 로그아웃/탈퇴 안정성 향상 |
| Core Value | 앱 안정성과 사용자 신뢰도 향상 — 매칭/통화 핵심 플로우 버그 예방 |

---

## 1. 분석 결과 요약

코드 분석 도구 결과: **품질 점수 58/100**, 총 28개 이슈 발견

| 심각도 | 개수 | 주요 파일 |
|--------|------|----------|
| High | 9 | CallScreen, useWebRTC, useSocketMatching, MyPageScreen, MatchResultScreen |
| Medium | 11 | client.ts, MatchingScreen, FriendListScreen, LoginScreen |
| Low | 8 | 매직 넘버, 중복 코드, 타입 |

---

## 2. 우선순위별 수정 계획

### Priority 1 — High (즉시 수정)

| # | 파일 | 이슈 | 수정 방향 |
|---|------|------|----------|
| H-1 | `CallScreen.tsx` | `handleEndCall` 에러 후 navigate 계속 실행 | try 블록 안에서 navigate, 에러 시 Alert |
| H-2 | `CallScreen.tsx` | 타이머가 통화 종료 후에도 계속 실행 (메모리 누수) | `timerRef`로 interval 관리, 종료 시 즉시 clear |
| H-3 | `CallScreen.tsx` | `handleEndCall` 중복 실행 (사용자 탭 + 타임아웃 동시) | `isEndingRef`로 race condition 방지 |
| H-4 | `useSocketMatching.ts` | `disconnect` 리스너 cleanup 누락, 중복 리스너 누적 | cleanup에서 모든 리스너 제거 |
| H-5 | `MyPageScreen.tsx` | `logoutApi()`, `deleteAccount()` 빈 catch — 실패 시 무음 처리 | 탈퇴 실패 시 Alert 표시, logout은 최소 console.warn |
| H-6 | `MyPageScreen.tsx` | `getMe()` 실패 시 피드백 없음 | catch에서 최소 console.warn |
| H-7 | `MatchResultScreen.tsx` | `getMatchResult()` 실패 시 무음 처리 | 에러 상태 + "다시 시도" or Alert |
| H-8 | `useWebRTC.ts` | `(pc as any).onXxx` 패턴 5곳 | 타입 단언 최소화, 타입 가드 적용 |
| H-9 | `client.ts` | `logout()` await 누락 → SecureStore 미정리 상태로 Login 이동 | `await logout()` 추가 |

### Priority 2 — Medium (이번 사이클 내 개선)

| # | 파일 | 이슈 | 수정 방향 |
|---|------|------|----------|
| M-1 | `CallScreen.tsx` | CharacterBlob 코드 중복 (4개 파일) | `src/components/CharacterBlob.tsx` 추출 |
| M-2 | `MatchingScreen.tsx` | `startMatching` 의존성 배열 불안정 | useCallback 의존성 정리 |
| M-3 | `LoginScreen.tsx` | `GoogleSignin.configure()` 모듈 레벨 실행 | useEffect 내부로 이동 |

### Priority 3 — Low (시간 여유 시)

- 매직 넘버 상수화 (`TOTAL_SECONDS`, `LOCK_SECONDS`, `POLLING_INTERVAL`)
- `useWebRTC.ts` `iceServers` 메모이제이션
- `FriendListScreen` 파일 분리 (502줄 → FriendDetailModal 추출)

---

## 3. 범위 (Scope)

**IN:**
- Priority 1 (H-1~H-9) 전체 수정
- Priority 2 M-1 (`CharacterBlob` 컴포넌트 추출)
- Priority 2 M-2, M-3 핵심 수정

**OUT:**
- i18n / 다국어 지원
- 전체 파일 구조 리팩토링
- FriendListScreen 분리 (별도 사이클)
- 테스트 코드 작성

---

## 4. 영향 파일 목록

| 파일 | 변경 유형 |
|------|----------|
| `src/screens/CallScreen.tsx` | 수정 (H-1, H-2, H-3, M-1) |
| `src/hooks/useSocketMatching.ts` | 수정 (H-4) |
| `src/screens/MyPageScreen.tsx` | 수정 (H-5, H-6) |
| `src/screens/MatchResultScreen.tsx` | 수정 (H-7) |
| `src/hooks/useWebRTC.ts` | 수정 (H-8) |
| `src/api/client.ts` | 수정 (H-9) |
| `src/screens/MatchingScreen.tsx` | 수정 (M-2) |
| `src/screens/LoginScreen.tsx` | 수정 (M-3) |
| `src/components/CharacterBlob.tsx` | 신규 (M-1) |

---

## 5. 완료 기준 (Definition of Done)

- [ ] H-1~H-9 이슈 모두 수정
- [ ] `CharacterBlob` 컴포넌트 추출 및 4개 파일에서 재사용
- [ ] `client.ts` `await logout()` 수정
- [ ] TypeScript 오류 없음
- [ ] 기존 기능 동작 유지 (로그인, 매칭, 통화, 결과, 친구, 마이페이지)
