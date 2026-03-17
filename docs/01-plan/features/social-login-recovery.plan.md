# Plan: social-login-recovery

## Goal
Restore Google/Kakao/Line social login buttons to LoginScreen while keeping the existing email/password login.
Present both methods via a tab UI (소셜 / 이메일).

## Background
Commit `a19b832` (onboarding flow rewrite) overwrote LoginScreen with email-only login,
removing Google OAuth (`expo-auth-session`) + Kakao + Line buttons.
Env var names also changed: `EXPO_PUBLIC_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_WEB_CLIENT_ID`.

## Scope
- `src/screens/LoginScreen.tsx` — Tab UI: 소셜 탭 + 이메일 탭
- `src/api/auth.ts` — Add `loginWithSocial(provider, token)` → POST /auth/social-login
- `.env` — Already has correct Google OAuth client IDs (no change needed)
- `CLAUDE.md` — Update auth section, backend-pending list

## Out of Scope
- Backend `/auth/social-login` implementation (backend task)
- Kakao / Line native SDK (placeholder buttons, shows "준비 중" alert)

## Backend Dependency
POST `/auth/social-login` { provider: "google"|"kakao"|"line", token: string }
→ Response: { success: true, data: { accessToken: string } } + Set-Cookie refreshToken
Status: **NOT implemented** — frontend calls endpoint, will fail until backend adds it.

## UI Design
```
[소셜] [이메일]   ← tab selector

소셜 탭:
  [카카오로 시작하기]  (노란색)
  [구글로 시작하기]   (흰색 테두리)
  [라인으로 시작하기] (초록색)

이메일 탭:
  [이메일 입력]
  [비밀번호 입력]
  [로그인] 버튼
  [회원가입 링크]
```

## Acceptance Criteria
- [ ] 소셜/이메일 탭 전환 가능
- [ ] Google 버튼 → expo-auth-session 실행 → id_token → POST /auth/social-login
- [ ] Kakao/Line 버튼 → "카카오/라인 로그인은 준비 중입니다" Alert
- [ ] 이메일 탭 → 기존 로그인 동작 그대로
- [ ] 로그인 성공 후 getMe() → ProfileSetup or MainTabs 라우팅
- [ ] 환경변수: EXPO_PUBLIC_ANDROID_CLIENT_ID, EXPO_PUBLIC_WEB_CLIENT_ID 사용
