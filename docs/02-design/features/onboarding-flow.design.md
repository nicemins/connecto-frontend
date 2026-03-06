# Design: onboarding-flow

> Plan 참조: `docs/01-plan/features/onboarding-flow.plan.md`

## 구현 목표 요약

| Goal | 설명 | 대상 파일 |
|------|------|-----------|
| G1 | ProfileSetupScreen — `createProfile` 사용 + 닉네임 중복 확인 | `src/screens/ProfileSetupScreen.tsx` |
| G2 | LanguageSetupScreen — `saveLanguage()` 사용 + InterestsSetup으로 이동 | `src/screens/LanguageSetupScreen.tsx` |
| G3 | LoginScreen — 로그인 후 온보딩 완료 여부 체크 | `src/screens/LoginScreen.tsx` |
| G4 | authStore — 토큰 영속화 (expo-secure-store) | `src/store/authStore.ts` |
| G5 | App.tsx — 초기 hydration + 자동 로그인 라우팅 | `App.tsx` |

---

## G1. ProfileSetupScreen.tsx

### 변경 사항

**현재:**
```typescript
await updateProfile({ nickname, bio });  // PATCH — 기존 유저 수정용
navigation.replace("LanguageSetup");
```

**변경 후:**
```typescript
// me.profile이 null이면 POST, 있으면 PATCH
const me = useAuthStore.getState().me;
if (me?.profile) {
  await updateProfile({ nickname, bio });
} else {
  await createProfile({ nickname, bio });
}
```

### 닉네임 중복 확인 추가
- 닉네임 입력 후 "다음" 버튼 누를 때 `checkNicknameAvailable()` 호출
- 중복이면 Alert 표시 후 진행 차단
- 순서: `checkNicknameAvailable` → 사용 가능 → `createProfile` or `updateProfile`

### Import 변경
```typescript
// 추가
import { createProfile, updateProfile, checkNicknameAvailable } from "../api/profile";
// 제거
import { updateProfile } from "../api/profile";
```

---

## G2. LanguageSetupScreen.tsx

### 변경 사항

**현재:**
```typescript
import { apiClient } from "../api/client";
// ...
await apiClient.post("/users/me/languages", { languageCode: nativeLang, type: "NATIVE", level: "NATIVE" });
await apiClient.post("/users/me/languages", { languageCode: learningLang, type: "LEARNING", level });
navigation.replace("MainTabs");  // 잘못된 목적지
```

**변경 후:**
```typescript
import { saveLanguage } from "../api/languages";
// ...
await saveLanguage({ languageCode: nativeLang, type: "NATIVE", level: "NATIVE" });
await saveLanguage({ languageCode: learningLang, type: "LEARNING", level });
navigation.replace("InterestsSetup");  // 올바른 온보딩 순서
```

### Import 정리
- `apiClient` import 제거 (더 이상 직접 사용 안 함)
- `saveLanguage` from `../api/languages` 추가

---

## G3. LoginScreen.tsx

### 로그인 후 라우팅 로직

**현재:**
```typescript
navigation.replace("MainTabs");  // 항상 MainTabs
```

**변경 후:**
```typescript
const me = await getMe();
setMe(me);

if (!me.profile) {
  navigation.replace("ProfileSetup");
} else if (!me.languages || me.languages.length === 0) {
  navigation.replace("LanguageSetup");
} else {
  navigation.replace("MainTabs");
}
```

### 라우팅 결정 트리
```
로그인 성공 → getMe()
  ├─ profile === null       → ProfileSetup
  ├─ languages.length === 0 → LanguageSetup
  └─ 모두 완료              → MainTabs
```

---

## G4. authStore.ts — 토큰 영속화

### 의존성
```bash
npx expo install expo-secure-store
```

### 저장 키 상수
```typescript
const STORAGE_KEY_ACCESS  = "connecto_access_token";
const STORAGE_KEY_REFRESH = "connecto_refresh_token";
```

### 추가 액션

```typescript
interface AuthState {
  // 기존 필드 유지
  accessToken: string | null;
  refreshToken: string | null;
  me: UserMeResponse | null;
  isHydrated: boolean;           // 추가: 토큰 로드 완료 여부

  // 기존 액션 유지
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setMe: (me: UserMeResponse | null) => void;
  logout: () => void;

  // 추가 액션
  persistTokens: (access: string, refresh: string | null) => Promise<void>;
  loadTokens: () => Promise<{ access: string | null; refresh: string | null }>;
  clearPersistedTokens: () => Promise<void>;
}
```

### persistTokens 구현
```typescript
persistTokens: async (access, refresh) => {
  await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, access);
  if (refresh) await SecureStore.setItemAsync(STORAGE_KEY_REFRESH, refresh);
  set({ accessToken: access, refreshToken: refresh });
},
```

### loadTokens 구현
```typescript
loadTokens: async () => {
  const access = await SecureStore.getItemAsync(STORAGE_KEY_ACCESS);
  const refresh = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);
  if (access) set({ accessToken: access });
  if (refresh) set({ refreshToken: refresh });
  set({ isHydrated: true });
  return { access, refresh };
},
```

### clearPersistedTokens 구현 (logout 시 호출)
```typescript
clearPersistedTokens: async () => {
  await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
  await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
},
```

### logout 수정
```typescript
logout: () => {
  // clearPersistedTokens는 비동기이므로 별도 호출
  set({ accessToken: null, refreshToken: null, me: null });
},
```

---

## G5. App.tsx — 초기 Hydration

### 현재
```typescript
export default function App() {
  useNotifications();
  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
    </>
  );
}
```

### 변경 후 흐름
```
앱 시작
  → loadTokens()
  → 토큰 없음 → RootNavigator(initialRoute="Login")
  → 토큰 있음 → getMe() 검증
      → 성공 → setMe() → RootNavigator(initialRoute="MainTabs")
      → 실패(401) → clearPersistedTokens() → RootNavigator(initialRoute="Login")
  → isHydrated=true 전까지 로딩 스피너 표시
```

### 구현 방법

```typescript
export default function App() {
  useNotifications();
  const { loadTokens, setMe, logout, clearPersistedTokens, isHydrated } = useAuthStore();
  const [initialRoute, setInitialRoute] = React.useState<"Login" | "MainTabs">("Login");

  React.useEffect(() => {
    (async () => {
      const { access } = await loadTokens();
      if (access) {
        try {
          const me = await getMe();
          setMe(me);
          setInitialRoute("MainTabs");
        } catch {
          await clearPersistedTokens();
          logout();
          setInitialRoute("Login");
        }
      } else {
        setInitialRoute("Login");
      }
    })();
  }, []);

  if (!isHydrated) {
    return <SplashView />;  // 로딩 중 표시
  }

  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator initialRoute={initialRoute} />
    </>
  );
}
```

### RootNavigator props 변경
```typescript
// types 변경 없음 — initialRouteName만 prop으로 받도록 수정
export default function RootNavigator({ initialRoute }: { initialRoute: "Login" | "MainTabs" }) {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}  // 동적 초기 라우트
        screenOptions={{ headerShown: false }}
      >
        ...
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### SplashView 컴포넌트 (App.tsx 내 인라인)
```typescript
function SplashView() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E8D5F2" }}>
      <ActivityIndicator size="large" color="#8b5cf6" />
    </View>
  );
}
```

---

## LoginScreen 토큰 저장 수정

로그인 성공 시 `persistTokens()` 사용:

**현재:**
```typescript
setAccessToken(accessToken);
if (refreshToken) setRefreshToken(refreshToken);
```

**변경 후:**
```typescript
await persistTokens(accessToken, refreshToken);
```

---

## 파일별 변경 요약

| 파일 | 변경 유형 | 핵심 변경 |
|------|----------|-----------|
| `src/store/authStore.ts` | 수정 | `isHydrated`, `persistTokens`, `loadTokens`, `clearPersistedTokens` 추가 |
| `App.tsx` | 수정 | hydration 로직 + SplashView + `initialRoute` prop 전달 |
| `src/navigation/RootNavigator.tsx` | 수정 | `initialRoute` prop 수신 + `initialRouteName` 동적 설정 |
| `src/screens/LoginScreen.tsx` | 수정 | `persistTokens` 사용 + 온보딩 체크 라우팅 |
| `src/screens/ProfileSetupScreen.tsx` | 수정 | `createProfile` vs `updateProfile` 분기 + 닉네임 중복 확인 |
| `src/screens/LanguageSetupScreen.tsx` | 수정 | `saveLanguage()` 사용 + `InterestsSetup`으로 이동 |

---

## 구현 순서

1. `authStore.ts` — `isHydrated`, `persistTokens`, `loadTokens`, `clearPersistedTokens` 추가
2. `App.tsx` — hydration 로직 + SplashView
3. `RootNavigator.tsx` — `initialRoute` prop 수신
4. `LoginScreen.tsx` — `persistTokens` + 온보딩 체크
5. `ProfileSetupScreen.tsx` — `createProfile` 분기 + 닉네임 중복 확인
6. `LanguageSetupScreen.tsx` — `saveLanguage()` + `InterestsSetup`

---

## 성공 기준

- [ ] 신규 유저: SignUp → ProfileSetup → LanguageSetup → InterestsSetup → MainTabs
- [ ] 기존 유저: 앱 재시작 → 자동 로그인 → MainTabs (토큰 유효 시)
- [ ] 토큰 만료: 앱 재시작 → Login 화면
- [ ] 닉네임 중복 시: Alert 표시, 진행 차단
- [ ] TypeScript 0 errors
