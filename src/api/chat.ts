import { apiClient } from "./client";

export type ChatRoom = {
  roomId: number;
  friendId: number;
  friendNickname: string;
  friendProfileImageUrl: string | null;
  lastMessage: string | null;
  updatedAt: string;
  unreadCount: number;
};

export type ChatMessage = {
  id: number;
  senderId: number;
  content: string | null;
  imageUrl?: string | null;
  messageType?: "TEXT" | "IMAGE";
  createdAt: string;
};

export type ChatMessagesResponse = {
  messages: ChatMessage[];
  hasNext: boolean;
  page: number;
  size: number;
};

/**
 * 채팅방 생성 (이미 있으면 기존 반환)
 * POST /chat/rooms
 */
export async function createChatRoom(friendId: number): Promise<ChatRoom> {
  const { data } = await apiClient.post<{ success: boolean; data: ChatRoom }>(
    "/chat/rooms",
    { friendId }
  );
  return data.data;
}

/**
 * 채팅방 목록 조회 (최신 메시지 순)
 * GET /chat/rooms
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  const { data } = await apiClient.get<{ success: boolean; data: ChatRoom[] }>("/chat/rooms");
  return data.data;
}

/**
 * 채팅 이미지 전송
 * POST /chat/rooms/{roomId}/messages/image
 */
export async function sendChatImage(roomId: number, uri: string): Promise<ChatMessage> {
  const filename = uri.split("/").pop() ?? "image.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("image", { uri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await apiClient.post<{ success: boolean; data: ChatMessage }>(
    `/chat/rooms/${roomId}/messages/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

/**
 * 메시지 히스토리 조회 (최신순 페이징)
 * GET /chat/rooms/{roomId}/messages?page=0&size=50
 */
export async function getChatMessages(
  roomId: number,
  page = 0,
  size = 50
): Promise<ChatMessagesResponse> {
  const { data } = await apiClient.get<{ success: boolean; data: ChatMessagesResponse }>(
    `/chat/rooms/${roomId}/messages`,
    { params: { page, size } }
  );
  return data.data;
}
