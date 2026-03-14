# Gap Analysis: social-login-recovery

**Date:** 2026-03-07
**Match Rate:** 100%
**Phase:** Check ✅

---

## Plan vs Implementation Comparison

### Acceptance Criteria

| # | Criteria | Status | Evidence |
|---|----------|--------|----------|
| 1 | 소셜/이메일 탭 전환 가능 | ✅ | `activeTab` state + tabContainer UI (`LoginScreen.tsx:48,193-221`) |
| 2 | Google 버튼 → expo-auth-session → id_token → POST /auth/social-login | ✅ | `handleGoogle` + `loginWithSocial("google", token)` (`LoginScreen.tsx:97-110`, `auth.ts:50-63`) |
| 3 | Kakao/Line 버튼 → "준비 중" Alert | ✅ | `handleKakao`, `handleLine` Alert (`LoginScreen.tsx:112-118`) |
| 4 | 이메일 탭 → 기존 로그인 동작 | ✅ | `handleEmailLogin` with `login(email, password)` (`LoginScreen.tsx:120-141`) |
| 5 | 로그인 성공 후 getMe() → ProfileSetup or MainTabs | ✅ | Both social and email handlers call `getMe()` then branch on `!me.profile` |
| 6 | 환경변수: EXPO_PUBLIC_ANDROID_CLIENT_ID / EXPO_PUBLIC_WEB_CLIENT_ID 사용 | ✅ | `LoginScreen.tsx:55-56` |

### Scope Items

| Item | Status | Notes |
|------|--------|-------|
| `LoginScreen.tsx` — Tab UI | ✅ | 소셜/이메일 탭, 캐릭터, 로고, 이용약관 footer 모두 포함 |
| `auth.ts` — `loginWithSocial()` | ✅ | `POST /auth/social-login`, refreshToken Set-Cookie 추출 포함 |
| `.env` — Google OAuth env vars | ✅ | 기존 EXPO_PUBLIC_ANDROID_CLIENT_ID / WEB_CLIENT_ID 확인 |
| `CLAUDE.md` — 업데이트 | ✅ | 6.1 소셜 로그인 엔드포인트, 백엔드 미구현 항목, 환경변수 섹션 추가 |

### TypeScript

```
npx tsc --noEmit → 0 errors
```

---

## Gaps Found

**None.** 모든 Acceptance Criteria 충족.

---

## Backend Dependency (Action Required)

프론트엔드 구현은 완료되었으나 **백엔드 소셜 로그인 엔드포인트가 미구현** 상태입니다.
Google 로그인은 UI/OAuth까지는 정상 동작하지만 최종 서버 인증 단계에서 실패합니다.

### 백엔드 구현 요청 스펙

```
POST /auth/social-login
Authorization: X (public endpoint)

Request Body:
{
  "provider": "google" | "kakao" | "line",
  "token": "<OAuth ID Token or Access Token>"
}

Response (200):
{
  "success": true,
  "data": { "accessToken": "<JWT>" }
}
Set-Cookie: refreshToken=<token>; HttpOnly; SameSite=Strict

Error (401):
{
  "success": false,
  "message": "유효하지 않은 소셜 토큰입니다."
}
```

### Google 토큰 검증 방법 (백엔드 참고)
- 프론트에서 전달: `idToken` (우선) 또는 `accessToken`
- 검증 라이브러리: `google-auth-library` (Java: `com.google.auth:google-auth-library-oauth2-http`)
- Google tokeninfo endpoint: `GET https://oauth2.googleapis.com/tokeninfo?id_token=<TOKEN>`
- 검증 후 `email` 추출 → User 조회 or 자동 가입 → JWT 발급

---

## Conclusion

**Match Rate: 100%** — 프론트엔드 구현 완료.
다음 단계: 백엔드 `POST /auth/social-login` 구현 후 End-to-End 테스트.
