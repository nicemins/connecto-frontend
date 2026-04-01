# security-fixes Design

> Plan: `docs/01-plan/features/security-fixes.plan.md`
> 보안 감사 보고서: `docs/02-design/security-spec.md`

---

## 1. SEC-H3: Rate Limiting (LoginScreen, SignUpScreen)

### 상태 구조

```typescript
// LoginScreen.tsx, SignUpScreen.tsx 각각에 추가
const [failCount, setFailCount] = useState(0);
const [cooldownUntil, setCooldownUntil] = useState<number>(0); // timestamp ms
const [cooldownRemaining, setCooldownRemaining] = useState(0); // seconds
const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

### Backoff 계산

```typescript
function getBackoffMs(failCount: number): number {
  if (failCount >= 5) return 30_000; // 30초 강제 쿨다운
  return Math.min(1000 * Math.pow(2, failCount - 1), 16_000); // 1s, 2s, 4s, 8s, 16s
}
```

### 핸들러 수정 패턴

```typescript
const handleLogin = async () => {
  // 쿨다운 중이면 차단
  if (Date.now() < cooldownUntil) return;

  setLoading(true);
  try {
    // ... 기존 로그인 로직 ...
    setFailCount(0); // 성공 시 초기화
  } catch (error) {
    const newCount = failCount + 1;
    setFailCount(newCount);
    const backoff = getBackoffMs(newCount);
    const until = Date.now() + backoff;
    setCooldownUntil(until);
    startCooldownTimer(until);
    // ... Alert 표시 ...
  } finally {
    setLoading(false);
  }
};

function startCooldownTimer(until: number) {
  if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
  cooldownTimerRef.current = setInterval(() => {
    const remaining = Math.ceil((until - Date.now()) / 1000);
    if (remaining <= 0) {
      setCooldownRemaining(0);
      clearInterval(cooldownTimerRef.current!);
    } else {
      setCooldownRemaining(remaining);
    }
  }, 1000);
}
```

### UI 변경 (버튼)

```tsx
<TouchableOpacity
  disabled={loading || Date.now() < cooldownUntil}
  onPress={handleLogin}
>
  <Text>
    {cooldownRemaining > 0
      ? `${cooldownRemaining}초 후 다시 시도`
      : '로그인'}
  </Text>
</TouchableOpacity>
```

### Cleanup (useEffect)

```typescript
useEffect(() => {
  return () => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
  };
}, []);
```

---

## 2. SEC-H4: Socket.IO Auth Error Recovery (socket.ts)

### 현재 코드 (문제)

```typescript
socket.on('connect_error', (err) => {
  console.warn('[Socket] connect_error:', err.message);
});
```

### 수정 코드

```typescript
import { useAuthStore } from '../store/authStore';

let isRefreshingSocketToken = false; // 무한 루프 방지 플래그

// getSocket() 내부 connect_error 핸들러
socketInstance.on('connect_error', async (err) => {
  const errMsg = err.message?.toLowerCase() ?? '';
  const isAuthError = errMsg.includes('auth') ||
                      errMsg.includes('unauthorized') ||
                      errMsg.includes('token') ||
                      errMsg.includes('forbidden');

  if (isAuthError && !isRefreshingSocketToken) {
    isRefreshingSocketToken = true;
    try {
      // authStore의 refresh 로직 재사용
      const { refreshAccessToken } = useAuthStore.getState();
      const newToken = await refreshAccessToken();
      if (newToken && socketInstance) {
        socketInstance.auth = { token: newToken };
        (socketInstance.io.opts as any).query = { token: newToken };
        socketInstance.disconnect().connect();
      }
    } catch {
      // refresh 실패 → 로그아웃
      const { logout } = useAuthStore.getState();
      await logout();
      // navigationRef를 통해 Login으로 이동
      import('../navigation/navigationRef').then(({ navigationRef }) => {
        navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
      });
    } finally {
      isRefreshingSocketToken = false;
    }
  } else if (!isAuthError) {
    console.warn('[Socket] connect_error:', err.message);
  }
});
```

> **참고:** `authStore.ts`에 `refreshAccessToken(): Promise<string | null>` 함수가 없으면 추가 필요.
> 현재 `client.ts`의 interceptor에만 refresh 로직이 있으므로, 분리된 helper 함수 추출.

### refreshAccessToken helper

```typescript
// src/api/auth.ts 에 추가
export async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, persistTokens } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await apiClient.post('/auth/refresh', null, {
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    const newToken: string = res.data.data.accessToken;
    await persistTokens(newToken);
    return newToken;
  } catch {
    return null;
  }
}
```

---

## 3. SEC-M1: Profile Edit maxLength (MyPageScreen.tsx)

대상 라인: 닉네임 TextInput, bio TextInput

```tsx
// 닉네임
<TextInput
  value={editNickname}
  onChangeText={setEditNickname}
  maxLength={30}          // ← 추가
  placeholder="닉네임"
/>

// bio
<TextInput
  value={editBio}
  onChangeText={setEditBio}
  maxLength={500}          // ← 추가
  multiline
  placeholder="자기소개"
/>
```

---

## 4. SEC-M2: Console 로그 프로덕션 제거 (babel.config.js)

### 방법 A: __DEV__ 조건부 (라이브러리 추가 불필요)

```typescript
// src/utils/logger.ts (새 파일)
export const logger = {
  warn: (...args: unknown[]) => { if (__DEV__) console.warn(...args); },
  error: (...args: unknown[]) => { if (__DEV__) console.error(...args); },
  log: (...args: unknown[]) => { if (__DEV__) console.log(...args); },
};
```

대상 파일에서 `console.warn` / `console.error` → `logger.warn` / `logger.error` 교체:
- `socket.ts:33`
- `useWebRTC.ts:111, 166, 192, 222, 277, 291, 306`
- `MyPageScreen.tsx:54, 64`
- `MatchResultScreen.tsx:95, 121, 147`

### 방법 B: babel-plugin-transform-remove-console (권장)

```bash
npm install --save-dev babel-plugin-transform-remove-console
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProduction ? [['transform-remove-console', { exclude: ['error'] }]] : []),
    ],
  };
};
```

> 방법 B 선택: 코드 변경 최소화, 기존 console.* 유지.

---

## 5. SEC-M4: 이미지 업로드 강화 검증 (MyPageScreen.tsx, profile.ts)

### MyPageScreen.tsx 수정

```typescript
const handleImagePick = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return;
  const asset = result.assets[0];

  // SEC-M4: 강화된 검증
  if (asset.fileSize === undefined || asset.fileSize === null) {
    Alert.alert('오류', '파일 크기를 확인할 수 없습니다.');
    return;
  }
  if (asset.fileSize > 5 * 1024 * 1024) {
    Alert.alert('오류', '이미지 크기는 5MB 이하여야 합니다.');
    return;
  }
  if (!asset.width || !asset.height || asset.width <= 0 || asset.height <= 0) {
    Alert.alert('오류', '유효하지 않은 이미지입니다.');
    return;
  }

  // 기존 업로드 로직 유지
  await updateProfileImage(asset);
};
```

---

## 6. SEC-M7: IDOR 방지 (MatchResultScreen.tsx)

### 현재 코드 (문제)

```typescript
const resolvedPartnerNumericId = partnerProfile?.profile?.id ?? (partnerId ? parseInt(partnerId, 10) : null);
```

### 수정 코드

```typescript
// 서버 반환 ID만 사용. 아직 로드되지 않았으면 null.
const resolvedPartnerNumericId = partnerProfile?.profile?.id ?? null;
```

```tsx
// 친구신청, 신고 버튼: 서버 ID가 없으면 비활성화
<TouchableOpacity
  disabled={!resolvedPartnerNumericId || friendRequestSent}
  onPress={handleFriendRequest}
>
```

---

## 7. SEC-L2: 비밀번호 State 초기화 (LoginScreen, SignUpScreen)

```typescript
// LoginScreen.tsx handleLogin finally 블록
} finally {
  setLoading(false);
  setPassword('');        // ← 추가
}

// SignUpScreen.tsx handleSignUp finally 블록
} finally {
  setLoading(false);
  setPassword('');        // ← 추가
  setConfirmPassword(''); // ← 추가
}
```

---

## 8. SEC-L3: 회원탈퇴 재인증 (MyPageScreen.tsx)

### 상태 추가

```typescript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deletePassword, setDeletePassword] = useState('');
const [deleteLoading, setDeleteLoading] = useState(false);
```

### 흐름

```
탈퇴 버튼 → Alert("정말 탈퇴하시겠습니까?")
  → 확인 → setShowDeleteModal(true) → 비밀번호 입력 Modal
  → 비밀번호 입력 후 확인 → POST /auth/login 검증
  → 성공 → DELETE /users/me → logout → Login 이동
  → 실패 → "비밀번호가 올바르지 않습니다"
```

### Modal UI

```tsx
<Modal visible={showDeleteModal} transparent animationType="fade">
  <View className="flex-1 justify-center items-center bg-black/50">
    <View className="bg-white rounded-2xl p-6 w-80">
      <Text className="text-lg font-bold mb-4">탈퇴 확인</Text>
      <Text className="text-gray-600 mb-4">비밀번호를 입력하여 탈퇴를 확인해주세요.</Text>
      <TextInput
        value={deletePassword}
        onChangeText={setDeletePassword}
        secureTextEntry
        placeholder="비밀번호"
        maxLength={128}
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
      />
      <TouchableOpacity onPress={handleConfirmDelete} disabled={deleteLoading}>
        <Text>탈퇴하기</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
        <Text>취소</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

> **소셜 로그인 사용자 처리:** `me.user.email`이 없거나 비밀번호 없는 계정은 비밀번호 검증 스킵 후 바로 탈퇴.
> (소셜 로그인 사용자 판별: `GET /users/me` 응답에 provider 정보 없으면 email 존재 여부로 판별)

---

## 9. 파일별 변경 요약

| 파일 | 변경 내용 | 관련 FR |
|------|----------|---------|
| `src/screens/LoginScreen.tsx` | failCount + cooldown state, backoff 로직, 버튼 비활성화, setPassword('') | H3, L2 |
| `src/screens/SignUpScreen.tsx` | failCount + cooldown state, backoff 로직, 버튼 비활성화, setPassword/Confirm('') | H3, L2 |
| `src/screens/MyPageScreen.tsx` | maxLength 추가, 이미지 검증 강화, 탈퇴 재인증 Modal | M1, M4, L3 |
| `src/screens/MatchResultScreen.tsx` | partnerId 폴백 제거, 버튼 조건부 비활성화 | M7 |
| `src/api/socket.ts` | connect_error 인증 오류 감지 + refresh + 재연결 | H4 |
| `src/api/auth.ts` | `refreshAccessToken()` helper 함수 추가 | H4 |
| `babel.config.js` | transform-remove-console (production) | M2 |
