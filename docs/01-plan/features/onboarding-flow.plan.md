# Plan: onboarding-flow

## Overview
신규 유저 온보딩 플로우 완성 — 토큰 영속화, 로그인 후 라우팅, API 정확도 수정

## Background (CLAUDE.md 13장 기준)

| 버그/미구현 | 위치 | 상태 |
|-----------|------|------|
| `updateProfile` (PATCH) → 신규 유저는 `createProfile` (POST) 사용해야 함 | `ProfileSetupScreen.tsx` | 버그 |
| 닉네임 중복 확인 미사용 | `ProfileSetupScreen.tsx` | 미구현 |
| `apiClient.post` 직접 호출 → `saveLanguage()` 로 교체 필요 | `LanguageSetupScreen.tsx` | 버그 |
| `LanguageSetup` 완료 후 `MainTabs` 이동 → `InterestsSetup`으로 변경 | `LanguageSetupScreen.tsx` | 버그 |
| 로그인 후 `me.profile === null` 체크 없이 항상 `MainTabs` 이동 | `LoginScreen.tsx` | 미구현 |
| 앱 재시작 시 토큰 소실 (AsyncStorage/SecureStore 미적용) | `authStore.ts` | 미구현 (High) |
| SplashScreen — 토큰 검증 후 라우팅 | 없음 | 미구현 |

## Goals

### G1. `ProfileSetupScreen.tsx` 수정
- 신규 유저 → `createProfile()` (POST /users/me/profile)
- 닉네임 입력 시 `checkNicknameAvailable()` 중복 확인 (디바운스 or 버튼)
- `navigation.replace("LanguageSetup")` 유지

### G2. `LanguageSetupScreen.tsx` 수정
- `apiClient.post` 직접 호출 → `saveLanguage()` from `../api/languages` 로 교체
- 완료 후 `navigation.replace("InterestsSetup")` (기존 `MainTabs` → 변경)

### G3. `LoginScreen.tsx` 수정
- 로그인 성공 후 `me.profile === null` → `ProfileSetup`으로 이동
- 프로필 있으면 기존대로 `MainTabs` 이동

### G4. 토큰 영속화 (`authStore.ts` + `App.tsx`)
- `expo-secure-store` 사용해 `accessToken`, `refreshToken` 저장/복원
- `authStore`에 `loadTokens()`, `persistTokens()` 액션 추가
- `App.tsx`에서 앱 시작 시 `loadTokens()` 호출 → 토큰 있으면 `/users/me` 검증

### G5. SplashScreen 역할 — `App.tsx` 수정
- 토큰 로드 중 로딩 화면 표시 (`isHydrating` 상태)
- 토큰 유효 → `MainTabs` 또는 온보딩 체크
- 토큰 없음/만료 → `Login`

## Scope
- `src/screens/ProfileSetupScreen.tsx`
- `src/screens/LanguageSetupScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/store/authStore.ts`
- `App.tsx`

## Out of Scope
- SignUpScreen 변경 없음
- 소셜 로그인
- 온보딩 중 뒤로가기 방지

## Success Criteria
- 신규 유저: SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
- 기존 유저: 앱 재시작 → 토큰 복원 → 자동 로그인 → MainTabs
- 닉네임 중복 시 오류 메시지 표시
- TypeScript 0 errors

## 의존성
```bash
npx expo install expo-secure-store
```
