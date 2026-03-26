# Design — block-list

> Plan: `docs/01-plan/features/block-list.plan.md`
> 작성일: 2026-03-25

---

## 변경 파일 목록

| 파일 | 변경 종류 |
|------|----------|
| `src/api/friends.ts` | `BlockedUser` 타입 추가, `getBlockedUsers()` 함수 추가 |
| `src/navigation/types.ts` | `RootStackParamList`에 `BlockList: undefined` 추가 |
| `src/navigation/RootNavigator.tsx` | `BlockListScreen` 라우트 등록 |
| `src/screens/BlockListScreen.tsx` | 신규 생성 |
| `src/screens/MyPageScreen.tsx` | "차단 목록" 버튼 추가 |

---

## 1. `src/api/friends.ts`

### BlockedUser 타입 추가
```typescript
export type BlockedUser = {
  blockedUserId: number;
  nickname: string | null;
  profileImageUrl: string | null;
  blockedAt: string;
};
```

### getBlockedUsers 함수
```typescript
/**
 * 차단 목록 조회
 * GET /users/me/blocks
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await apiClient.get<{ success: boolean; data: BlockedUser[] }>(
    "/users/me/blocks"
  );
  return data.data;
}
```

> `unblockUser(blockedUserId)` 는 이미 구현됨 — 재사용

---

## 2. `src/navigation/types.ts`

```typescript
export type RootStackParamList = {
  // 기존 ...
  BlockList: undefined;  // 신규
};
```

---

## 3. `src/navigation/RootNavigator.tsx`

기존 Screen 목록에 추가:
```tsx
import BlockListScreen from "../screens/BlockListScreen";
// ...
<Stack.Screen name="BlockList" component={BlockListScreen} />
```

---

## 4. `src/screens/BlockListScreen.tsx` (신규)

### State / Ref
```
blocks: BlockedUser[]          — 차단 목록
loading: boolean               — 초기 로딩
unblockingId: number | null    — 해제 중인 userId (버튼 disabled용)
```

### 데이터 흐름
```
마운트 → getBlockedUsers()
  성공: setBlocks(data)
  실패: Alert("목록을 불러오지 못했습니다.")

handleUnblock(blockedUserId)
  → setUnblockingId(blockedUserId)
  → unblockUser(blockedUserId)
      성공: setBlocks(prev => prev.filter(b => b.blockedUserId !== blockedUserId))
      실패: Alert("차단 해제에 실패했습니다.")
  → setUnblockingId(null)
```

### 렌더링 구조
```
SafeAreaView (dark gradient background)
  ├─ Header Row
  │   ├─ BackButton (←)  → navigation.goBack()
  │   └─ Title "차단 목록"
  │
  └─ 조건 분기
      loading → ActivityIndicator
      blocks.length === 0 → 빈 상태 뷰 ("차단한 유저가 없습니다")
      else → FlatList
               └─ BlockedUserItem
                   ├─ 프로필 이미지 (40×40, 없으면 기본 아바타 텍스트)
                   ├─ 닉네임 (없으면 "알 수 없음")
                   ├─ 차단 날짜 (blockedAt → "YYYY.MM.DD")
                   └─ "차단 해제" 버튼
                       unblockingId === item.blockedUserId → ActivityIndicator
                       else → "차단 해제" Text
```

### 날짜 포맷 헬퍼
```typescript
// blockedAt: "2026-03-20T10:30:00" → "2026.03.20"
function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}
```

### UI 스타일 기준 (NativeWind)
- 배경: LinearGradient (기존 화면과 동일 — `#1e1b4b` → `#0f172a`)
- 아이템 카드: `bg-white/10 border border-white/20 rounded-2xl`
- 차단 해제 버튼: `bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-1`
- 버튼 텍스트: `text-red-400 text-xs font-semibold`

---

## 5. `src/screens/MyPageScreen.tsx`

### 계정 카드에 "차단 목록" 버튼 추가

기존 계정 카드 구조:
```
[로그아웃 버튼]
[회원 탈퇴 텍스트]
```

변경 후:
```
[차단 목록 버튼]   ← 신규 추가
[로그아웃 버튼]
[회원 탈퇴 텍스트]
```

추가 코드:
```tsx
<Pressable
  onPress={() => navigation.navigate("BlockList")}
  className="h-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-2"
>
  <Text className="text-white text-sm font-semibold">차단 목록</Text>
</Pressable>
```

---

## 구현 순서

1. `friends.ts` — `BlockedUser` 타입 + `getBlockedUsers()` 추가
2. `types.ts` — `BlockList: undefined` 추가
3. `RootNavigator.tsx` — Screen 등록
4. `BlockListScreen.tsx` — 전체 구현
5. `MyPageScreen.tsx` — 버튼 추가
