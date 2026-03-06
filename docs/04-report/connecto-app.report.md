# Completion Report — connecto-app API 연동 3개 태스크

**완료일**: 2026-03-05
**Match Rate**: 93% (>= 90% 기준 충족)
**Phase**: Do → Check → Report 완료

---

## 1. 개요

Connecto 스펙(Google Sheets) 분석을 통해 도출된 3개의 Critical/High 우선순위 Gap을
구현 완료하였습니다.

---

## 2. 구현 완료 목록

### Task 1: Token Auto Refresh — `src/api/client.ts`
**Match Rate: 100%**

| 항목 | 내용 |
|---|---|
| 구현 방식 | Axios Response Interceptor |
| 핵심 로직 | 401 감지 → POST /auth/refresh → 원래 요청 재시도 |
| 동시성 처리 | isRefreshing 플래그 + pendingRequests 큐로 중복 갱신 방지 |
| 무한루프 방지 | _retry 플래그 |
| 실패 처리 | logout() + resetToLogin() |

**변경 포인트**:
- `withCredentials: true` 기본 설정 추가 (Refresh Token 쿠키 전송)
- 별도 axios 인스턴스로 refresh 요청 (인터셉터 순환 방지)
- 공개 API (Authorization 헤더 없는 요청) 갱신 스킵

---

### Task 2: Match Result API 연동 — `src/api/call.ts` + `src/screens/CallScreen.tsx`
**Match Rate: 85%**

| 항목 | 내용 |
|---|---|
| 추가 API 함수 | `getMatchResult(sessionId)` → GET /match/result/{sid} |
| 추가 타입 | `MatchResultData` (sessionId, partnerId, partnerNickname, partnerProfileImageUrl, totalTime) |
| CallScreen 변경 | endCall 후 getMatchResult 호출, 실제 partnerId 전달 |
| 에러 처리 | API 실패 시 null 반환, 클라이언트 기본값 fallback |

**변경 포인트**:
- `CallScreen.tsx`: `partnerId: undefined` → `matchResult?.partnerId` (실제 값)
- `call.ts`: `import { endCall, callAgain }` → `import { endCall, getMatchResult }`
- 잔여 Gap: MatchResultScreen에서 파트너 닉네임/이미지 미표시 (익명성 정책에 의거 별도 티켓 권장)

---

### Task 3: MyPage 프로필 수정 — `src/api/profile.ts` + `src/store/authStore.ts` + `src/screens/MyPageScreen.tsx`
**Match Rate: 100%** (미사용 import 제거 후)

| 항목 | 내용 |
|---|---|
| authStore 변경 | `UserProfile`에 `nickname`, `bio` 필드 추가 |
| getMyProfile 수정 | `/users/me` → `/users/me/profile` (스펙 정렬) |
| 추가 API 함수 | `updateProfile(payload)` → PATCH /users/me/profile |
| MyPageScreen UI | 닉네임 인라인 표시 + 편집(TextInput)/저장/취소 |
| Validation | 20자 길이 제한, 빈 문자열 방지 |
| 저장 후 처리 | authStore.updateUserProfile({ nickname }) 반영 |

---

## 3. 변경 파일 목록

| 파일 | 변경 유형 | 주요 내용 |
|---|---|---|
| `src/api/client.ts` | 수정 | 토큰 갱신 인터셉터 전면 재작성 |
| `src/api/call.ts` | 수정 | `MatchResultData` 타입 + `getMatchResult()` 추가 |
| `src/api/profile.ts` | 수정 | `updateProfile()`, `ProfileUpdateRequest/Response` 추가, endpoint 수정 |
| `src/store/authStore.ts` | 수정 | `nickname`, `bio` 필드 추가 |
| `src/screens/CallScreen.tsx` | 수정 | import 변경, `getMatchResult` 호출 및 결과 전달 |
| `src/screens/MyPageScreen.tsx` | 수정 | import 추가, 닉네임 상태/UI/핸들러 추가 |

---

## 4. 테스트 결과

| 검증 방법 | 결과 |
|---|---|
| TypeScript 타입 체크 (`npx tsc --noEmit`) | 변경 파일 에러 0건 |
| 기존 LoginScreen.tsx의 pre-existing 에러 | 변경 전부터 존재, 이번 작업과 무관 |
| Gap Analysis Match Rate | 93% (>= 90% 기준 충족) |

---

## 5. 잔여 작업 (다음 스프린트 권장)

| 우선순위 | 항목 | 설명 |
|---|---|---|
| 중간 | MatchResultScreen 파트너 프로필 표시 | getMatchResult의 partnerNickname/Image 활용 |
| 낮음 | LoginScreen.tsx DEVELOPER_ERROR 타입 에러 | `statusCodes` 타입 정의 불일치 (pre-existing) |
| 낮음 | `/users/exists/email` 이메일 중복 체크 | 회원가입 플로우에서 미사용 |

---

## 6. 결론

3개 핵심 태스크 모두 구현 완료. 토큰 만료 문제 해결(Task 1)로 실서버 연동 시
세션 안정성이 확보되었고, Match Result API 연동(Task 2)으로 통화 결과 화면이
실제 데이터를 받을 준비가 완료되었으며, 프로필 수정(Task 3)으로 사용자
닉네임 관리가 가능해졌습니다.
