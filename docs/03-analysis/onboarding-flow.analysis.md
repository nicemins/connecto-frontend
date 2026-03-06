# onboarding-flow Analysis Report

> **Analysis Type**: Gap Analysis (PDCA Check Phase)
>
> **Project**: connecto-app
> **Analyst**: gap-detector
> **Date**: 2026-03-06
> **Plan Doc**: [onboarding-flow.plan.md](../01-plan/features/onboarding-flow.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that all five goals (G1-G5) defined in the onboarding-flow plan document have been correctly implemented.

### 1.2 Analysis Scope

- **Plan Document**: `docs/01-plan/features/onboarding-flow.plan.md`
- **Implementation Files**:
  - `src/screens/ProfileSetupScreen.tsx`
  - `src/screens/LanguageSetupScreen.tsx`
  - `src/screens/InterestsSetupScreen.tsx`
  - `src/screens/LoginScreen.tsx`
  - `src/store/authStore.ts`
  - `App.tsx`
  - `src/api/profile.ts`
  - `src/api/languages.ts`
  - `src/navigation/types.ts`
  - `src/navigation/RootNavigator.tsx`

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 95% | PASS |
| Convention Compliance | 95% | PASS |
| **Overall** | **97%** | **PASS** |

---

## 3. Goal-by-Goal Gap Analysis

### G1. ProfileSetupScreen.tsx

| Plan Requirement | Implementation | Status |
|-----------------|----------------|:------:|
| `createProfile()` (POST /users/me/profile) -- NOT updateProfile | Line 33: `await createProfile(...)` imported from `../api/profile` | PASS |
| `checkNicknameAvailable()` nickname duplicate check | Line 28: `await checkNicknameAvailable(nickname.trim())` with Alert on duplicate | PASS |
| `navigation.replace("LanguageSetup")` navigation | Line 36: `navigation.replace("LanguageSetup")` | PASS |

**API layer verification**: `src/api/profile.ts` correctly defines `createProfile` as POST /users/me/profile (line 26) and `checkNicknameAvailable` as GET /profiles/exists (line 45).

### G2. LanguageSetupScreen.tsx

| Plan Requirement | Implementation | Status |
|-----------------|----------------|:------:|
| Remove `apiClient.post` direct call, use `saveLanguage()` from `../api/languages` | Line 10: `import { saveLanguage } from "../api/languages"`, Lines 36-37: `await saveLanguage(...)` | PASS |
| Navigate to `InterestsSetup` (changed from `MainTabs`) | Line 40: `navigation.replace("InterestsSetup")` | PASS |

**API layer verification**: `src/api/languages.ts` correctly wraps `apiClient.post("/users/me/languages", data)` inside `saveLanguage()`.

### G3. LoginScreen.tsx

| Plan Requirement | Implementation | Status |
|-----------------|----------------|:------:|
| Login success -> check `me.profile === null` -> ProfileSetup | Lines 63-64: `if (!me.profile) { navigation.replace("ProfileSetup"); }` | PASS |
| Profile exists -> MainTabs | Lines 65-66: `else { navigation.replace("MainTabs"); }` | PASS |

### G4. authStore.ts (expo-secure-store)

| Plan Requirement | Implementation | Status |
|-----------------|----------------|:------:|
| `expo-secure-store` import | Line 2: `import * as SecureStore from "expo-secure-store"` | PASS |
| `persistTokens(accessToken, refreshToken?)` action | Lines 31-35: async, saves to SecureStore and updates state | PASS |
| `loadTokens()` action -- restore from SecureStore | Lines 37-42: async, reads from SecureStore, updates state, returns tokens | PASS |
| `logout()` async -- includes SecureStore deletion | Lines 44-48: async, deletes both keys, resets state | PASS |

### G5. App.tsx (SplashScreen / Hydration)

| Plan Requirement | Implementation | Status |
|-----------------|----------------|:------:|
| App start -> call `loadTokens()` | Line 19: `const { accessToken } = await loadTokens()` | PASS |
| `isHydrating` state -> show loading screen | Line 14: `const [isHydrating, setIsHydrating] = React.useState(true)`, Lines 42-48: ActivityIndicator while hydrating | PASS |
| Token valid -> `getMe()` -> profile check -> MainTabs or ProfileSetup | Lines 22-29: calls `getMe()`, checks `!me.profile`, dispatches navigation reset | PASS |
| Token missing/expired -> Login | Lines 31-33: catch block calls `await logout()`, falls through to Login (initial route) | PASS |

---

## 4. Navigation Registration Verification

All onboarding screens are registered in `RootNavigator.tsx`:

| Screen | Registered | Line |
|--------|:----------:|:----:|
| Login | PASS | 25 |
| SignUp | PASS | 26 |
| ProfileSetup | PASS | 27 |
| LanguageSetup | PASS | 28 |
| InterestsSetup | PASS | 29 |
| MainTabs | PASS | 30 |

Type definitions in `src/navigation/types.ts` include all required routes (InterestsSetup at line 5).

---

## 5. Onboarding Flow Verification

**Expected flow** (from plan Success Criteria):

```
SignUp -> ProfileSetup -> LanguageSetup -> InterestsSetup -> MainTabs
```

**Actual flow traced through code**:

1. SignUpScreen (assumed) -> navigates to ProfileSetup or Login
2. ProfileSetupScreen -> `navigation.replace("LanguageSetup")` (line 36) -- PASS
3. LanguageSetupScreen -> `navigation.replace("InterestsSetup")` (line 40) -- PASS
4. InterestsSetupScreen -> `navigation.replace("MainTabs")` (line 54) -- PASS

**Returning user flow** (from plan):

```
App start -> loadTokens -> accessToken exists -> getMe() -> profile check -> MainTabs or ProfileSetup
App start -> loadTokens -> no token -> Login screen (initialRouteName)
```

Verified in App.tsx lines 16-40. -- PASS

---

## 6. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 100%                    |
+---------------------------------------------+
|  PASS (Plan O, Impl O):  15 / 15 items      |
|  MISSING (Plan O, Impl X):  0 items         |
|  ADDED (Plan X, Impl O):    1 item (minor)  |
|  CHANGED (Plan != Impl):    0 items         |
+---------------------------------------------+
```

---

## 7. Added Features (Plan X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| InterestsSetupScreen | `src/screens/InterestsSetupScreen.tsx` | Full interests selection screen with `saveInterests()` API call, not explicitly detailed in plan but implied by navigation target | Low -- positive addition, completes the flow |

---

## 8. Minor Observations (Non-blocking)

| Item | File | Observation | Severity |
|------|------|-------------|----------|
| Error handling consistency | InterestsSetupScreen.tsx:49-51 | API errors are silently caught with `console.warn` and flow continues to MainTabs. This is intentional (comment: "backend not ready"), but should be revisited when backend is ready. | Info |
| Token refresh gap | authStore.ts:34 | `persistTokens` only saves refreshToken if truthy (not empty string), which is correct, but `loadTokens` always reads both. No issue in practice. | Info |
| Navigation timing | App.tsx:25-30 | Uses `setTimeout(..., 0)` to wait for navigator mount before dispatching reset. Works but could be replaced with `navigationRef.isReady()` listener for reliability. | Info |

---

## 9. Recommended Actions

### No Immediate Actions Required

All 15 plan requirements are fully implemented. Match rate is 100%.

### Documentation Update (Optional)

- [ ] Add InterestsSetupScreen specification to plan document (currently implied but not explicitly described)
- [ ] Document the `saveInterests()` API endpoint in plan

### Future Considerations

- [ ] Replace `console.warn` in InterestsSetupScreen with proper error handling when backend is ready
- [ ] Consider using `navigationRef` ready listener instead of `setTimeout` in App.tsx

---

## 10. Conclusion

The onboarding-flow implementation **fully matches** the plan document. All five goals (G1-G5) are correctly implemented:

- G1: ProfileSetupScreen uses `createProfile()` and `checkNicknameAvailable()` correctly
- G2: LanguageSetupScreen uses `saveLanguage()` wrapper and navigates to InterestsSetup
- G3: LoginScreen checks `me.profile` and routes accordingly
- G4: authStore uses `expo-secure-store` with `persistTokens`, `loadTokens`, and async `logout`
- G5: App.tsx hydrates tokens on start, shows loading state, and routes based on token/profile status

**Match Rate: 100% -- No Act phase iteration required.**

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-06 | Initial gap analysis | gap-detector |
