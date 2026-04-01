# 백엔드 작업 지시 — 차단 목록 조회 API

> **요청일**: 2026-03-25
> **우선순위**: 🟡 Medium
> **관련 파일**: `src/api/friends.ts`, `src/screens/BlockListScreen.tsx`

---

## 요청 작업: GET /users/me/blocks

### 개요

차단한 유저 목록을 조회하는 API입니다.
`DELETE /users/me/blocks/{blockedUserId}` (차단 해제)는 이미 구현되어 있으므로
**조회 API 하나만 추가**하면 프론트 구현을 시작할 수 있습니다.

---

### API 스펙

```
GET /users/me/blocks
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "blockedUserId": 42,
      "nickname": "익명의고양이",
      "profileImageUrl": "https://cdn.connecto.app/profiles/img_abc.jpg",
      "blockedAt": "2026-03-20T10:30:00Z"
    },
    {
      "blockedUserId": 77,
      "nickname": "조용한사람",
      "profileImageUrl": null,
      "blockedAt": "2026-03-22T14:00:00Z"
    }
  ]
}
```

**빈 목록:**
```json
{ "success": true, "data": [] }
```

---

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `blockedUserId` | number | 차단된 유저의 User PK (unblockUser 호출 시 사용) |
| `nickname` | string \| null | 차단 시점 또는 현재 닉네임 |
| `profileImageUrl` | string \| null | 프로필 이미지 URL (없으면 null) |
| `blockedAt` | string (ISO 8601) | 차단한 시각 |

> `blockedUserId`는 프론트에서 `DELETE /users/me/blocks/{blockedUserId}` 호출 시 그대로 사용합니다.

---

### 기존 코드 참고

차단 생성은 `POST /friends/{friendshipId}/block`에서 Block 엔티티를 생성합니다.
해당 Block 테이블에서 `blocker = 현재 유저`인 레코드를 조회하면 됩니다.

```java
// 예시
@GetMapping("/users/me/blocks")
public ApiResponse<List<BlockedUserResponse>> getBlockedUsers(@AuthUserId Long userId) {
    List<BlockedUserResponse> blocks = blockService.getBlockedUsers(userId);
    return ApiResponse.success(blocks);
}
```

---

### 완료 후 알려주세요

API 완성 시 응답 필드명 확정본 공유 부탁드립니다.
프론트에서 `getBlockedUsers()` 함수 연동 후 `BlockListScreen` 구현을 즉시 시작합니다.
