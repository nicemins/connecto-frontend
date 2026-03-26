# Plan — block-list

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | block-list |
| 시작일 | 2026-03-25 |
| 범위 | 차단 목록 조회 · 해제 UI (프론트엔드) + GET /users/me/blocks API (백엔드) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 차단한 유저를 확인하거나 해제할 방법이 없어 차단 상태가 영구 고착됨 |
| Solution | MyPage → BlockListScreen (별도 Stack Screen) — 차단 목록 조회 + 해제 버튼 |
| Function / UX Effect | "차단 목록" 버튼 → 목록 화면 → 유저별 "차단 해제" → 즉시 반영 |
| Core Value | 유저가 관계를 능동적으로 관리할 수 있어 안전한 커뮤니티 환경 구축 |

---

## 1. 기능 범위

### In Scope
- `GET /users/me/blocks` — 차단 목록 조회 (백엔드 신규)
- `BlockListScreen` — 차단 유저 FlatList + 차단 해제 버튼
- MyPageScreen에 "차단 목록" 메뉴 항목 추가
- `RootStackParamList`에 `BlockList` 라우트 추가

### Out of Scope
- 차단 중인 유저와의 채팅/통화 접근 제한 (이미 백엔드에서 처리)
- 차단 사유 입력
- 차단 유저 검색/필터

---

## 2. API 스펙

### 신규 (백엔드 요청)

```
GET /users/me/blocks
Authorization: Bearer <token>
→ 200: [{ blockedUserId, nickname, profileImageUrl, blockedAt }]
```

### 기존 (이미 구현)

```
DELETE /users/me/blocks/{blockedUserId}   — 차단 해제 ✅ friends.ts의 unblockUser()
```

---

## 3. 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/api/friends.ts` | `BlockedUser` 타입 추가, `getBlockedUsers()` 함수 추가 |
| `src/navigation/types.ts` | `RootStackParamList`에 `BlockList: undefined` 추가 |
| `src/navigation/RootNavigator.tsx` | `BlockListScreen` 라우트 등록 |
| `src/screens/BlockListScreen.tsx` | 신규 — 차단 목록 FlatList + 해제 버튼 |
| `src/screens/MyPageScreen.tsx` | "차단 목록" 메뉴 항목 + navigate('BlockList') |

---

## 4. 구현 순서

1. `friends.ts` — `BlockedUser` 타입 + `getBlockedUsers()` 추가
2. `types.ts` — `BlockList` 라우트 추가
3. `RootNavigator.tsx` — Screen 등록
4. `BlockListScreen.tsx` — UI 구현
5. `MyPageScreen.tsx` — "차단 목록" 버튼 추가

---

## 5. 제약 조건

- 백엔드 `GET /users/me/blocks` 완성 후 연동
- 차단 해제 후 목록에서 즉시 제거 (낙관적 업데이트)
- 빈 목록 시 "차단한 유저가 없습니다" 안내 문구 표시
