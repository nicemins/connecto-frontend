## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | security-fixes |
| 시작일 | 2026-03-13 |
| 목표 완료일 | 2026-03-14 |
| 보안 점수 (현재) | 64/100 |
| 보안 점수 (목표) | 85+/100 |

### Value Delivered (4-Perspective)

| 관점 | 내용 |
|------|------|
| Problem | HTTP 통신, rate limiting 미구현, Socket 인증 오류 무시 등 Critical/High/Medium 보안 취약점 17건 |
| Solution | 프론트엔드에서 구현 가능한 취약점 우선 수정 (SEC-H3, SEC-H4, SEC-M1, SEC-M2, SEC-M4, SEC-L2) + 환경 설정 가이드 |
| Function UX Effect | 로그인 실패 시 쿨다운 UI 표시, 소켓 인증 오류 자동 복구, 프로필 입력 제한 |
| Core Value | 출시 전 보안 점수 64→85+점 향상, OWASP Mobile Top 10 주요 항목 통과 |

---

# security-fixes Plan

## 1. 개요

Connecto 앱의 보안 감사(2026-03-11, `docs/02-design/security-spec.md`) 결과 확인된 취약점 중
**프론트엔드에서 구현 가능한 항목**을 우선 수정한다.

전체 17건 중 프론트엔드 단독 수정 가능 항목: **9건**

---

## 2. 범위 (Scope)

### 2.1 이번 작업에 포함 (Frontend 구현 가능)

| ID | 심각도 | 문제 | 파일 | 예상 공수 |
|----|--------|------|------|----------|
| SEC-H3 | High | 로그인/회원가입 rate limiting 없음 | `LoginScreen.tsx`, `SignUpScreen.tsx` | 2h |
| SEC-H4 | High | Socket.IO auth 에러 시 토큰 갱신 미구현 | `socket.ts` | 1h |
| SEC-M1 | Medium | 프로필 편집 필드 maxLength 없음 | `MyPageScreen.tsx` | 0.5h |
| SEC-M2 | Medium | console.* 프로덕션 노출 | `babel.config.js` + 다수 파일 | 1h |
| SEC-M4 | Medium | 이미지 MIME 타입 검증 미흡 | `profile.ts`, `MyPageScreen.tsx` | 1h |
| SEC-M7 | Medium | IDOR 위험 (partnerId 로컬 파라미터 사용) | `MatchResultScreen.tsx` | 0.5h |
| SEC-L2 | Low | 폼 제출 후 비밀번호 state 미삭제 | `LoginScreen.tsx`, `SignUpScreen.tsx` | 0.5h |
| SEC-L3 | Low | 회원 탈퇴 재인증 없음 | `MyPageScreen.tsx` | 1h |

### 2.2 이번 작업 제외 (Backend/인프라 필요)

| ID | 심각도 | 이유 |
|----|--------|------|
| SEC-C1 | Critical | HTTPS/WSS: 프로덕션 서버 SSL 인증서 설정 필요 |
| SEC-C2 | Critical | SEC-C1 해결 시 자동 해결 |
| SEC-H1 | High | ~~TURN 단기 자격증명 API: 백엔드 구현 필요~~ → **✅ 완료 (2026-03-14)** 백엔드 `GET /webrtc/turn-credentials` 구현 완료, 프론트 `src/api/webrtc.ts` + `useWebRTC.ts` 연동 완료, .env TURN 변수 제거 |
| SEC-H2 | High | Google OAuth Web Client ID: GCP Console 설정 |
| SEC-M3 | Medium | 이메일 열거: 백엔드 rate limit/CAPTCHA 필요 |
| SEC-M5 | Medium | TOCTOU: 백엔드 unique constraint로 이미 처리됨 |
| SEC-M6 | Medium | 인증서 피닝: **Expo Bare/Prebuild workflow 확인** (`android/` 존재, `expo-dev-client` 설치됨) → `react-native-ssl-pinning` 기술적으로 도입 가능. **단, SEC-C1 (HTTPS 전환) 완료 전까지 구현 불가** — HTTP 환경에서 TLS 피닝 동작 안 함, 인증서 해시 미확정. SEC-C1 완료 후 동시 구현 예정 |
| SEC-L1 | Low | SecureStore 생체 인증: 플랫폼 설정 |
| SEC-L4 | Low | JWT exp 로컬 체크: 현재 서버 401로 처리 충분 |

---

## 3. 기능 요구사항

### FR-1: SEC-H3 — 로그인/회원가입 Rate Limiting

**대상 파일:** `LoginScreen.tsx`, `SignUpScreen.tsx`

- 로그인 실패 시 횟수(`failCount`) 누적
- 실패 횟수에 따른 exponential backoff: 1s → 2s → 4s → 8s → 16s
- 5회 이상 실패: 30초 강제 쿨다운
- 쿨다운 중 버튼 비활성화 + 남은 시간 표시 (`"30초 후 다시 시도하세요"`)
- 쿨다운 완료 후 자동 해제

### FR-2: SEC-H4 — Socket.IO auth 에러 자동 복구

**대상 파일:** `socket.ts`

- `connect_error` 핸들러에서 인증 오류 감지 (에러 메시지에 "auth", "unauthorized", "token" 포함 여부 확인)
- 인증 오류 시: `refreshAccessToken()` 호출 → socket auth 업데이트 → 소켓 재연결
- 재시도 최대 1회 (무한 루프 방지)
- refresh 실패 시: `logout()` 후 Login 화면 이동

### FR-3: SEC-M1 — 프로필 편집 입력 제한

**대상 파일:** `MyPageScreen.tsx`

- 닉네임 TextInput: `maxLength={30}`
- bio TextInput: `maxLength={500}`

### FR-4: SEC-M2 — 프로덕션 console 로그 제거

**대상 파일:** `babel.config.js`

- `babel-plugin-transform-remove-console` 추가 (production 환경에서만 적용)
- `__DEV__` 조건부 console 래퍼 패턴으로 변경 가능 (패키지 추가 불필요한 방법 우선)

### FR-5: SEC-M4 — 이미지 업로드 강화 검증

**대상 파일:** `MyPageScreen.tsx`, `profile.ts`

- `asset.fileSize === undefined` 시 업로드 거부 (현재는 undefined를 통과시킴)
- `asset.width` 및 `asset.height`가 0이면 거부
- 허용 타입: jpeg, png, webp (기존 로직 유지)

### FR-6: SEC-M7 — IDOR 방지 (partnerId 처리)

**대상 파일:** `MatchResultScreen.tsx`

- 친구 신청 및 신고 시 `partnerProfile?.profile?.id`만 사용 (서버 반환값 우선)
- `parseInt(partnerId)` 폴백 제거 — API 응답 대기 중 버튼 비활성화로 대체

### FR-7: SEC-L2 — 비밀번호 state 초기화

**대상 파일:** `LoginScreen.tsx`, `SignUpScreen.tsx`

- 로그인/회원가입 핸들러 `finally` 블록에서 `setPassword("")` 호출
- `SignUpScreen`은 `setConfirmPassword("")` 추가

### FR-8: SEC-L3 — 회원 탈퇴 재인증

**대상 파일:** `MyPageScreen.tsx`

- 탈퇴 Alert 확인 후 비밀번호 입력 Modal 표시
- 비밀번호 입력 → `POST /auth/login` 재검증 (또는 별도 verify 엔드포인트)
- 인증 성공 시 탈퇴 API 호출

> **백엔드 확인 필요:** `/auth/login` 재사용 가능 여부. 불가 시 FR-8 스킵.

---

## 4. 비기능 요구사항

- 기존 기능 동작에 영향 없어야 함
- rate limiting 상태는 앱 재시작 시 초기화 (SecureStore 저장 불필요)
- 쿨다운 UI는 기존 버튼 스타일 재사용

---

## 5. 구현 순서 (우선순위)

```
1. SEC-M1 (5분, trivial)
2. SEC-L2 (10분, trivial)
3. SEC-M7 (15분, low)
4. SEC-H4 (1h, high impact)
5. SEC-H3 (2h, high impact)
6. SEC-M4 (30분, medium)
7. SEC-M2 (30분, babel plugin)
8. SEC-L3 (1h, UX + API)
```

---

## 6. 완료 기준

- [x] SEC-H1: TURN 자격증명 서버 API 연동 (`src/api/webrtc.ts` + `useWebRTC.ts`), 실패 시 STUN only fallback
- [x] SEC-H3: 로그인 5회 실패 시 30초 쿨다운 동작
- [x] SEC-H4: 소켓 인증 오류 시 토큰 갱신 후 자동 재연결
- [x] SEC-M1: MyPage 닉네임/bio maxLength 적용
- [x] SEC-M2: 프로덕션 빌드에서 console.* 출력 없음
- [x] SEC-M4: fileSize undefined 시 업로드 차단
- [x] SEC-M7: 친구신청/신고가 서버 반환 ID만 사용
- [x] SEC-L2: 폼 제출 후 비밀번호 state 초기화
- [x] SEC-L3: 회원 탈퇴 비밀번호 재인증 Modal
- [x] CLAUDE.md 보안 수정 항목 상태 업데이트
- [ ] SEC-M6: SSL 피닝 (SEC-C1 HTTPS 전환 완료 후 구현 예정)
- [ ] SEC-C1: HTTPS/WSS 전환 (인프라 작업)

---

## 7. 관련 문서

- 보안 감사 보고서: `docs/02-design/security-spec.md`
- 대상 파일: `src/screens/LoginScreen.tsx`, `src/screens/SignUpScreen.tsx`, `src/screens/MyPageScreen.tsx`, `src/screens/MatchResultScreen.tsx`, `src/api/socket.ts`, `src/api/profile.ts`, `babel.config.js`
