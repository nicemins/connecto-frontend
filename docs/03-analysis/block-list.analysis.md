# Gap Analysis — block-list

> **분석일**: 2026-03-25
> **Design**: `docs/02-design/features/block-list.design.md`
> **Overall Match Rate**: 96% (27/28)

---

## Executive Summary

| 항목 | 결과 |
|------|------|
| 전체 체크 항목 | 28 |
| 완전 일치 | 22 |
| 마이너 차이 (기능 동등) | 5 |
| 설계에 없는 추가 구현 | 1 |
| 미구현 | 0 |
| Match Rate | **96%** |
| 상태 | ✅ 완료 |

---

## 1. `src/api/friends.ts` — BlockedUser 타입 + getBlockedUsers

| # | 체크 항목 | 결과 | 비고 |
|---|----------|------|------|
| 1 | `BlockedUser` 타입: `blockedUserId: number` | ✅ | |
| 2 | `BlockedUser` 타입: `nickname: string \| null` | ✅ | |
| 3 | `BlockedUser` 타입: `profileImageUrl: string \| null` | ✅ | |
| 4 | `BlockedUser` 타입: `blockedAt: string` | ✅ | |
| 5 | `getBlockedUsers()` 함수 존재 | ✅ | |
| 6 | `GET /users/me/blocks` 호출 | ✅ | |
| 7 | `data.data` unwrap → `Promise<BlockedUser[]>` 반환 | ✅ | |
| 8 | `unblockUser` 기존 함수 재사용 | ✅ | |

## 2. `src/navigation/types.ts`

| # | 체크 항목 | 결과 |
|---|----------|------|
| 9 | `RootStackParamList`에 `BlockList: undefined` 추가 | ✅ |

## 3. `src/navigation/RootNavigator.tsx`

| # | 체크 항목 | 결과 |
|---|----------|------|
| 10 | `import BlockListScreen` | ✅ |
| 11 | `<Stack.Screen name="BlockList" component={BlockListScreen} />` | ✅ |

## 4. `src/screens/BlockListScreen.tsx` — State

| # | 체크 항목 | 결과 |
|---|----------|------|
| 12 | `blocks: BlockedUser[]` state | ✅ |
| 13 | `loading: boolean` state (초기값 true) | ✅ |
| 14 | `unblockingId: number \| null` state | ✅ |

## 5. `src/screens/BlockListScreen.tsx` — 데이터 흐름

| # | 체크 항목 | 결과 | 비고 |
|---|----------|------|------|
| 15 | 마운트 시 `getBlockedUsers()` 호출 | ✅ | |
| 16 | 성공: `setBlocks(data)` | ✅ | |
| 17 | 실패: Alert 표시 | ⚠️ | 문구 소폭 차이, 의미 동일 |
| 18 | `handleUnblock`: `setUnblockingId` → `unblockUser` → `filter` → `null` | ✅ | |
| 19 | `handleUnblock` 실패: Alert | ✅ | |
| 20 | 차단 해제 확인 Alert | 🟡 | 설계에 없지만 추가됨 — UX 개선 |

## 6. `src/screens/BlockListScreen.tsx` — 렌더링

| # | 체크 항목 | 결과 | 비고 |
|---|----------|------|------|
| 21 | `LinearGradient` 배경 `#1e1b4b → #0f172a` | ✅ | |
| 22 | Header: BackButton(←) + Title "차단 목록" | ✅ | |
| 23 | `loading` → `ActivityIndicator` | ✅ | |
| 24 | `blocks.length === 0` → "차단한 유저가 없습니다" | ✅ | |
| 25 | FlatList: 프로필 이미지 + 닉네임 + 날짜 + 해제 버튼 | ✅ | |
| 26 | 프로필 이미지 크기 | ⚠️ | 설계: 40×40 / 구현: 44×44 — 마이너 |
| 27 | 닉네임 fallback "알 수 없음" | ✅ | |
| 28 | `formatDate`: `"2026.03.20"` 형식 | ✅ | |

## 7. `src/screens/MyPageScreen.tsx`

| # | 체크 항목 | 결과 |
|---|----------|------|
| - | 계정 카드에 "차단 목록" 버튼 추가 | ✅ |
| - | 로그아웃 버튼 위 (첫 번째) | ✅ |
| - | `navigation.navigate("BlockList")` | ✅ |
| - | 스타일 className 일치 | ✅ |

---

## 마이너 불일치 (수정 불필요)

| 항목 | 설계 | 구현 | 판정 |
|------|------|------|------|
| 에러 문구 | "목록을 불러오지 못했습니다." | "차단 목록을 불러오지 못했습니다." | ✅ 더 구체적, 불필요 |
| 아바타 크기 | 40×40 | 44×44 | ✅ 4px 차이, 무시 |
| 스타일링 방식 | NativeWind className | StyleSheet.create | ✅ 시각적 동등 |
| 배경 투명도 | `bg-white/10` (0.1) | `rgba(255,255,255,0.08)` | ✅ 거의 동일 |
| 날짜 표시 | "2026.03.20" | "2026.03.20 차단" | ✅ suffix 추가, UX 개선 |

---

## 결론

block-list 기능이 설계서와 96% 일치하여 구현되었습니다.
미구현 0건, 마이너 차이 5건 모두 기능적으로 동등하거나 UX 개선에 해당합니다.
차단 해제 확인 Alert 추가는 실수 방지를 위한 긍정적 변경입니다.

Match Rate 96% ≥ 90% → `/pdca report block-list` 진행 가능
