import { apiClient } from "./client";

/**
 * GET /friends 응답 — 백엔드 FriendResponse
 */
export type Friend = {
  friendshipId: number;
  userId: number;
  nickname: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  friendSince: string;
};

/**
 * GET /friends/requests 응답 — 백엔드 FriendRequestResponse
 */
export type PendingFriendRequest = {
  id: number;
  senderId: number;
  senderNickname: string | null;
  senderProfileImageUrl: string | null;
  receiverId: number;
  receiverNickname: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
};

/**
 * 친구 목록 조회
 * GET /friends
 */
export async function getFriendList(): Promise<Friend[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Friend[] }>("/friends");
  return data.data;
}

/**
 * 받은 친구 요청 목록 조회 (PENDING 상태)
 * GET /friends/requests
 */
export async function getFriendRequests(): Promise<PendingFriendRequest[]> {
  const { data } = await apiClient.get<{ success: boolean; data: PendingFriendRequest[] }>("/friends/requests");
  return data.data;
}

/**
 * 친구 신청
 * POST /friends/request
 * @param receiverId - 신청받을 유저의 userId (number)
 */
export async function requestFriend(receiverId: number): Promise<PendingFriendRequest> {
  const { data } = await apiClient.post<{ success: boolean; data: PendingFriendRequest }>(
    "/friends/request",
    { receiverId }
  );
  return data.data;
}

/**
 * 친구 요청 수락
 * PATCH /friends/request/{requestId}/accept
 */
export async function acceptFriendRequest(requestId: number): Promise<PendingFriendRequest> {
  const { data } = await apiClient.patch<{ success: boolean; data: PendingFriendRequest }>(
    `/friends/request/${requestId}/accept`
  );
  return data.data;
}

/**
 * 친구 요청 거절
 * PATCH /friends/request/{requestId}/reject → 204 No Content
 */
export async function rejectFriendRequest(requestId: number): Promise<void> {
  await apiClient.patch(`/friends/request/${requestId}/reject`);
}

/**
 * 친구/차단 여부 확인
 * GET /friends/check?userId={targetUserId}
 */
export type FriendCheckResult = {
  isFriend: boolean;
  friendshipId: number | null;
  isBlocked: boolean;
};

export async function checkFriendStatus(targetUserId: number): Promise<FriendCheckResult> {
  const { data } = await apiClient.get<{ success: boolean; data: FriendCheckResult }>(
    `/friends/check?userId=${targetUserId}`
  );
  return data.data;
}

/**
 * 친구 삭제
 * DELETE /friends/{friendshipId}
 */
export async function deleteFriend(friendshipId: number): Promise<void> {
  await apiClient.delete(`/friends/${friendshipId}`);
}

/**
 * 친구 차단 (친구 관계 삭제 + 차단 생성)
 * POST /friends/{friendshipId}/block
 */
export async function blockFriend(friendshipId: number): Promise<void> {
  await apiClient.post(`/friends/${friendshipId}/block`);
}

/**
 * 차단 목록 조회
 * GET /users/me/blocks
 */
export type BlockedUser = {
  blockedUserId: number;
  nickname: string | null;
  profileImageUrl: string | null;
  blockedAt: string;
};

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await apiClient.get<{ success: boolean; data: BlockedUser[] }>(
    "/users/me/blocks"
  );
  return data.data;
}

/**
 * 차단 해제
 * DELETE /users/me/blocks/{blockedUserId}
 */
export async function unblockUser(blockedUserId: number): Promise<void> {
  await apiClient.delete(`/users/me/blocks/${blockedUserId}`);
}

export type FriendCallResponse = {
  sessionId: number;
  webrtcChannelId: string;
  friendId: number;
};

/**
 * 친구에게 통화 요청
 * POST /call/request/{friendId}
 * → 201: { sessionId, webrtcChannelId, friendId }
 */
export async function requestCallToFriend(friendId: number): Promise<FriendCallResponse> {
  const { data } = await apiClient.post<{ success: boolean; data: FriendCallResponse }>(
    `/call/request/${friendId}`
  );
  return data.data;
}
