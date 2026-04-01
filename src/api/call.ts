import { apiClient } from "./client";

export type CallEndRequest = {
  sessionId: number;
  reason?: string;
};

export type CallAgainRequest = {
  sessionId: number;
  wantAgain: boolean;
};

/**
 * 통화 종료
 * POST /call/end
 */
export async function endCall(sessionId: number, reason?: string) {
  const { data } = await apiClient.post<{ success: boolean }>(
    "/call/end",
    { sessionId, reason } as CallEndRequest
  );
  return data;
}

/**
 * 친구 통화 거절
 * POST /call/reject/{sessionId}
 */
export async function rejectCall(sessionId: number) {
  const { data } = await apiClient.post<{ success: boolean }>(
    `/call/reject/${sessionId}`
  );
  return data;
}

/**
 * 재연결 의사 표현
 * POST /call/again
 */
export async function callAgain(sessionId: number, wantAgain: boolean) {
  const { data } = await apiClient.post<{ success: boolean }>(
    "/call/again",
    { sessionId, wantAgain } as CallAgainRequest
  );
  return data;
}
