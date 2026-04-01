# Connecto React Native Security Audit Report (v2)

> **Date:** 2026-03-11 (updated)
> **Auditor:** Security Architect Agent
> **Scope:** Frontend codebase (`C:\connecto-app\src\`) -- 10 security-critical files
> **Framework:** OWASP Mobile Top 10 (2024) + OWASP Top 10 Web (2021)
> **Previous Audit:** 2026-03-11 (v1) -- this revision corrects findings that were fixed in code

---

## Summary

| Metric | Value |
|--------|-------|
| Files reviewed | 10 |
| Total issues found | 17 |
| Critical | 2 |
| High | 4 |
| Medium | 7 |
| Low | 4 |
| Security Score | 64/100 |

### Changes from v1

Several issues from v1 have been resolved in the current code:

- **SEC-H4 (v1) -- Backend error messages displayed**: Fixed. `getErrorMessage()` in both `LoginScreen.tsx` and `SignUpScreen.tsx` now returns hardcoded Korean strings based on HTTP status code, never exposing `response.data.message`.
- **SEC-H5 (v1) -- No password complexity**: Fixed. `SignUpScreen.tsx` lines 88-95 now require both letters and numbers (`/[A-Za-z]/` and `/[0-9]/`).
- **SEC-M3 (v1) -- No input length limits**: Partially fixed. `LoginScreen.tsx` has `maxLength={254}` (email) and `maxLength={128}` (password). `SignUpScreen.tsx` has the same limits. Still missing on `MyPageScreen.tsx` profile fields.
- **SEC-M5 (v1) -- No Axios timeout**: Fixed. `client.ts` line 11 now sets `timeout: 15000`.
- **SEC-M6 (v1) -- No image file size validation**: Fixed. `MyPageScreen.tsx` lines 106-109 enforce a 5MB limit.
- **SEC-M2 (v1) -- Socket token not refreshed on reconnection**: Fixed. `socket.ts` lines 24-29 add a `reconnect_attempt` handler that updates `socketInstance.auth` with the latest token.

---

## Critical Issues (Block Deployment)

### SEC-C1: All API and Socket.IO Communication Over Unencrypted HTTP

**Severity:** Critical
**OWASP:** A02 Cryptographic Failures / M3 Insecure Communication
**Files:**
- `C:\connecto-app\.env:6` -- `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`
- `C:\connecto-app\.env:9` -- `EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:9092`
- `C:\connecto-app\src\api\client.ts:6` -- fallback `http://localhost:8080`
- `C:\connecto-app\src\api\socket.ts:7` -- fallback `http://localhost:8080`

All REST API requests (including login credentials, access tokens, refresh tokens) and all Socket.IO connections (including WebRTC signaling data) are transmitted over unencrypted HTTP.

**Impact:** Every authenticated request, credential, token, and WebRTC signaling message is vulnerable to interception on any network hop. Complete account takeover is possible on shared/public WiFi.

**Recommendation:**
- All production URLs must use `https://` and `wss://`
- Add a runtime guard that rejects non-TLS base URLs in release builds
- Backend must set HSTS headers

---

### SEC-C2: Refresh Token Transmitted in Plaintext Cookie Header Over HTTP

**Severity:** Critical
**OWASP:** A02 Cryptographic Failures / A07 Authentication Failures
**File:** `C:\connecto-app\src\api\auth.ts:107`

```
{ headers: { Cookie: `refreshToken=${refreshToken}` } }
```

The refresh token -- which grants the ability to mint new access tokens -- is sent as a manual `Cookie` header over HTTP. An attacker who intercepts this single value gains persistent account access.

**Impact:** Full session hijack. Attacker can generate unlimited access tokens.

**Recommendation:**
- Enforce HTTPS for all auth endpoints (resolved by SEC-C1 fix)
- Backend should implement refresh token rotation (issue a new refresh token on each use)
- Backend should set `Secure; HttpOnly; SameSite=Strict` flags on the refresh token cookie

---

## High Issues (Fix Before Release)

### SEC-H1: TURN Server Credentials Exposed via EXPO_PUBLIC_ Environment Variables

**Severity:** High
**OWASP:** A02 Cryptographic Failures / A05 Security Misconfiguration
**File:** `C:\connecto-app\src\hooks\useWebRTC.ts:69-78`

TURN server credentials are read from `EXPO_PUBLIC_TURN_USERNAME` and `EXPO_PUBLIC_TURN_CREDENTIAL`. Any variable prefixed with `EXPO_PUBLIC_` is compiled into the JavaScript bundle and extractable by decompiling the APK/IPA.

Currently the `.env` file does not set these values (they fall back to empty strings), so the risk is latent. But when TURN is enabled for production, these credentials will be embedded in the bundle.

**Impact:** TURN server abuse (bandwidth theft, unauthorized relay).

**Recommendation:**
- Create a backend endpoint (e.g., `GET /webrtc/turn-credentials`) that returns short-lived, HMAC-based TURN credentials
- Remove `EXPO_PUBLIC_TURN_*` env vars entirely
- TURN servers should use time-limited credentials (RFC 5766 long-term credential mechanism)

---

### SEC-H2: Google OAuth Web Client ID in Client Bundle

**Severity:** High
**OWASP:** M9 Reverse Engineering / M1 Improper Platform Usage
**Files:**
- `C:\connecto-app\.env:2-3`
- `C:\connecto-app\src\screens\LoginScreen.tsx:54`

The Web Client ID (`431155986715-agus6bab65osgvmrvfigjetrnfpagltk.apps.googleusercontent.com`) is compiled into the JS bundle. While `.env` is in `.gitignore`, the built bundle contains this value. The Web Client ID is used for server-side token verification and could be used in phishing flows.

**Impact:** An attacker knowing the Web Client ID could craft OAuth consent screens impersonating the app.

**Recommendation:**
- Restrict the Web Client ID's authorized redirect URIs in Google Cloud Console to only the backend server's domain
- Ensure backend validates the `aud` claim matches exactly the expected client ID
- Android Client ID is lower risk since it is tied to the app signing certificate

---

### SEC-H3: No Client-Side Rate Limiting on Authentication Forms

**Severity:** High
**OWASP:** A07 Authentication Failures
**Files:**
- `C:\connecto-app\src\screens\LoginScreen.tsx:104`
- `C:\connecto-app\src\screens\SignUpScreen.tsx:74`

Neither login nor signup implements client-side rate limiting or exponential backoff. The `loading` state prevents concurrent submissions, but repeated sequential attempts are not throttled. The server returns 429 and the client displays the appropriate message, but there is no local cooldown.

**Impact:** Credential stuffing/brute force attacks generate unnecessary server load. Server-side rate limiting is the primary defense, but client-side mitigation is defense in depth.

**Recommendation:**
- Implement exponential backoff after failed login attempts (e.g., 1s, 2s, 4s)
- After 5 consecutive failures, enforce a 30-second minimum cooldown
- Display remaining cooldown time to the user

---

### SEC-H4: Socket.IO Auth Error Does Not Trigger Token Refresh

**Severity:** High
**OWASP:** A07 Authentication Failures
**File:** `C:\connecto-app\src\api\socket.ts:15-35`

The `getSocket()` function creates a new Socket.IO connection with the current access token. While the `reconnect_attempt` handler updates the token (good), the `connect_error` handler on line 32-34 only logs a warning. If the Socket.IO server rejects the connection due to an expired token, there is no mechanism to trigger a token refresh and retry.

**Impact:** Socket connections may fail permanently with expired tokens. Real-time features (matching, WebRTC signaling) break silently.

**Recommendation:**
- In the `connect_error` handler, check if the error indicates an auth failure (e.g., check error message or a custom error code from the server)
- If auth-related, trigger `refreshAccessToken()`, update the socket auth, and retry connection
- Disconnect and recreate the socket after successful token refresh

---

## Medium Issues (Fix in Next Sprint)

### SEC-M1: No Input Length Limits on Profile Edit Fields

**Severity:** Medium
**OWASP:** A03 Injection / M4 Insufficient Input/Output Validation
**File:** `C:\connecto-app\src\screens\MyPageScreen.tsx:252-276`

The nickname and bio `TextInput` components in MyPageScreen's edit mode have no `maxLength` prop. Users can enter arbitrarily long strings.

Note: `LoginScreen.tsx` and `SignUpScreen.tsx` correctly set `maxLength` on their fields. This issue is specific to the profile edit form.

**Impact:** Oversized input could cause API request failures, UI rendering issues, or backend storage abuse.

**Recommendation:**
- Add `maxLength={30}` for nickname, `maxLength={500}` for bio (or match backend limits)
- Backend should enforce these limits as the authoritative validation

---

### SEC-M2: Console Logging of Security-Sensitive Data in Production

**Severity:** Medium
**OWASP:** A09 Security Logging and Monitoring Failures
**Files:** Multiple across the codebase:
- `C:\connecto-app\src\api\socket.ts:33` -- socket connection errors
- `C:\connecto-app\src\hooks\useWebRTC.ts:111,166,192,222,277,291,306` -- WebRTC SDP/ICE internals
- `C:\connecto-app\src\screens\MyPageScreen.tsx:54,64` -- API error objects
- `C:\connecto-app\src\screens\MatchResultScreen.tsx:95,121,147` -- error objects

WebRTC SDP descriptions contain IP addresses and network topology. Error objects may contain stack traces or server URLs. On Android, `adb logcat` captures these in production.

**Impact:** Network topology disclosure, potential token fragments in error objects.

**Recommendation:**
- Use a logging library with environment-aware levels (e.g., `react-native-logs`)
- Add `babel-plugin-transform-remove-console` to strip console calls in release builds

---

### SEC-M3: Email Check Endpoint Enables User Enumeration

**Severity:** Medium
**OWASP:** A07 Authentication Failures
**Files:**
- `C:\connecto-app\src\screens\SignUpScreen.tsx:62`
- `C:\connecto-app\src\api\auth.ts:144`

The email availability check (`GET /users/exists/email?email=...`) confirms whether an email is registered. An attacker can enumerate valid user emails, then target them for credential stuffing on the login form.

**Impact:** User enumeration aids targeted attacks. Relevant for a platform where privacy matters.

**Recommendation:**
- Backend should add rate limiting and CAPTCHA on the email check endpoint
- Consider a combined signup approach that does not leak email existence

---

### SEC-M4: Image Upload MIME Type Determined by Extension Only

**Severity:** Medium
**OWASP:** A04 Insecure Design
**File:** `C:\connecto-app\src\api\profile.ts:66-69`

`updateProfileImage()` determines MIME type from the file extension. A file named `payload.jpg` containing non-image data would be uploaded with `image/jpeg` type. The 5MB size check in `MyPageScreen.tsx` is good but `asset.fileSize` may be `undefined`, making the check bypassable.

**Impact:** Malformed files could reach S3 storage.

**Recommendation:**
- Validate image dimensions (`width > 0 && height > 0`) from the picker result
- Reject upload if `fileSize` is `undefined`
- Backend should validate actual file magic bytes

---

### SEC-M5: Email Check Race Condition (TOCTOU)

**Severity:** Medium
**OWASP:** A04 Insecure Design
**File:** `C:\connecto-app\src\screens\SignUpScreen.tsx:49-108`

The email availability check and signup are separate API calls. Between the check and registration, another user could register the same email. The same pattern exists for nickname checks.

**Impact:** Race condition for duplicate registrations.

**Recommendation:** Mitigated if backend enforces unique constraints with proper error handling (409 Conflict). No frontend change strictly needed, but the 409 handler is correctly implemented.

---

### SEC-M6: No Certificate Pinning

**Severity:** Medium
**OWASP:** M3 Insecure Communication
**File:** `C:\connecto-app\src\api\client.ts`

The Axios client does not implement SSL certificate pinning. Even with HTTPS, a rogue CA or enterprise proxy could intercept TLS traffic.

**Impact:** MITM via compromised CA on corporate/school networks.

**Recommendation:**
- Implement certificate pinning using `react-native-ssl-pinning` or TrustKit
- Pin the leaf certificate or public key hash
- Plan for certificate rotation

---

### SEC-M7: IDOR Risk in Partner ID from Route Parameters

**Severity:** Medium
**OWASP:** A01 Broken Access Control
**File:** `C:\connecto-app\src\screens\MatchResultScreen.tsx:68-69`

```typescript
const resolvedPartnerNumericId = partnerProfile?.profile?.id ?? (partnerId ? parseInt(partnerId, 10) : null);
```

The `partnerId` from route params is used as a fallback before the server response arrives. If manipulated (e.g., via deep linking or a crafted navigation call), it could allow friend requests or reports against arbitrary user IDs.

**Impact:** Forged friend requests or false reports against arbitrary users.

**Recommendation:**
- Backend should validate that the partnerId matches the actual session participants
- Prefer using only the server-returned partner ID from `getMatchResult()`

---

## Low Issues (Track in Backlog)

### SEC-L1: No Biometric/PIN Protection for SecureStore Access

**Severity:** Low
**OWASP:** M1 Improper Platform Usage
**File:** `C:\connecto-app\src\store\authStore.ts:33-46`

SecureStore operations do not use `requireAuthentication: true`. Tokens can be read without biometric or PIN verification.

**Recommendation:** Consider enabling `requireAuthentication` on iOS for sensitive token reads.

---

### SEC-L2: Password Remains in Component State After Submission

**Severity:** Low
**OWASP:** M2 Insecure Data Storage
**Files:**
- `C:\connecto-app\src\screens\LoginScreen.tsx:48`
- `C:\connecto-app\src\screens\SignUpScreen.tsx:43-44`

Passwords are stored in `useState` during the form lifecycle and not cleared after submission. On a rooted device, memory inspection tools could extract the value.

**Recommendation:** Add `setPassword("")` in the `finally` block of login/signup handlers.

---

### SEC-L3: Account Deletion Without Re-Authentication

**Severity:** Low
**OWASP:** A07 Authentication Failures
**File:** `C:\connecto-app\src\screens\MyPageScreen.tsx:72-89`

Account deletion requires only an Alert confirmation dialog. No password re-entry or biometric check.

**Recommendation:** Add re-authentication (password prompt or biometric) before destructive account actions.

---

### SEC-L4: No Client-Side Token Expiry Check

**Severity:** Low
**OWASP:** M4 Insecure Authentication
**File:** `C:\connecto-app\src\store\authStore.ts`

The client stores tokens indefinitely. There is no local JWT `exp` claim check. Expired tokens are only detected when the server returns 401.

**Recommendation:** Optionally decode JWT to check `exp` before requests, or add a periodic freshness check.

---

## OWASP Mobile Top 10 (2024) Assessment

| Category | Status | Notes |
|----------|--------|-------|
| M1: Improper Platform Usage | WARNING | SecureStore correct but no biometric protection |
| M2: Insecure Data Storage | PASS | SecureStore for tokens, not AsyncStorage |
| M3: Insecure Communication | FAIL | All HTTP, no TLS/SSL, no cert pinning |
| M4: Insufficient Input/Output Validation | WARNING | Good on auth forms, missing on profile edit |
| M5: Insecure Authentication | WARNING | Password complexity exists but no rate limiting |
| M6: Insecure Authorization | PASS | Server-side authorization deferred correctly |
| M7: Client Code Quality | PASS | TypeScript, proper error handling, race condition guards |
| M8: Code Tampering | N/A | Standard React Native -- no runtime integrity checks |
| M9: Reverse Engineering | WARNING | TURN creds (latent), OAuth IDs in bundle |
| M10: Extraneous Functionality | WARNING | console.error/warn in production |

---

## Positive Security Practices Observed

1. **SecureStore for token storage** -- Uses `expo-secure-store` (hardware-backed keystore) instead of AsyncStorage
2. **401 interceptor with concurrent request queue** -- Properly handles token refresh race conditions with failedQueue pattern
3. **Password complexity validation** -- Requires 8+ chars with both letters and numbers
4. **Input length limits on auth forms** -- `maxLength={254}` for email, `maxLength={128}` for password
5. **Secure text entry** -- Password fields use `secureTextEntry` prop
6. **Token cleanup on logout** -- Both SecureStore and in-memory state cleared
7. **Socket reconnection token refresh** -- `reconnect_attempt` handler updates auth with latest token
8. **No HTML rendering** -- React Native `<Text>` components prevent XSS inherently
9. **Race condition guard** -- `isEndingRef.current` pattern in CallScreen
10. **Timer cleanup** -- All intervals/timeouts properly cleaned up on unmount
11. **.env in .gitignore** -- OAuth credentials excluded from version control
12. **Image file size check** -- 5MB limit on profile image upload
13. **Hardcoded error messages** -- `getErrorMessage()` never exposes backend error details
14. **Axios timeout configured** -- 15-second timeout prevents hung requests

---

## Remediation Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | SEC-C1: Enforce HTTPS/WSS for all URLs | Low (config) | Eliminates MITM class |
| 2 | SEC-C2: Protect refresh token in transit | Low (follows C1) | Prevents session hijack |
| 3 | SEC-H1: Fetch TURN creds from backend | Medium (new endpoint) | Prevents TURN abuse |
| 4 | SEC-H4: Socket auth error recovery | Low (code) | Prevents silent auth failure |
| 5 | SEC-H3: Client-side rate limiting | Low (code) | Reduces brute force surface |
| 6 | SEC-H2: Restrict OAuth client ID | Low (Google Console) | Reduces phishing risk |
| 7 | SEC-M1: Profile field maxLength | Trivial | Prevents input abuse |
| 8 | SEC-M2: Strip console in production | Low (Babel plugin) | Prevents log leakage |
| 9 | SEC-M4: Image content validation | Low | Defense in depth |
| 10 | SEC-M6: Certificate pinning | Medium | Advanced MITM defense |
| 11 | SEC-M3: Email enumeration mitigation | Medium (backend) | Privacy improvement |
| 12 | SEC-M7: IDOR partner ID | Low (backend) | Access control |

---

## Score Breakdown

| Category | Max | Score | Notes |
|----------|-----|-------|-------|
| Transport Security | 25 | 5 | HTTP everywhere, no cert pinning |
| Authentication | 20 | 15 | Good token mgmt, refresh queue, complexity checks |
| Data Protection | 20 | 16 | SecureStore, secureTextEntry, .gitignore |
| Input Validation | 15 | 11 | Good on auth forms, missing on profile edit |
| Secrets Management | 10 | 7 | TURN creds latent risk, OAuth IDs semi-public |
| Logging / Monitoring | 10 | 6 | Console.* in production |
| **Total** | **100** | **64** | |

---

*Report generated by Security Architect Agent -- Connecto Frontend Security Review v2*
*Framework: OWASP Mobile Top 10 (2024) + OWASP Top 10 Web (2021)*
