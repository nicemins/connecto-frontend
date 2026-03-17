import { apiClient } from "./client";

export type MatchResultData = {
  profile: {
    id: number;
    userId: number;
    nickname: string;
    profileImageUrl?: string;
    bio?: string;
  };
  wantAgain: boolean;
};

/**
 * 현재 매칭 상태 조회
 * GET /match/status
 */
export async function getMatchStatus(): Promise<{
  status: string;
  sessionId?: number;
  webrtcChannelId?: string;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: { status: string; sessionId?: number; webrtcChannelId?: string };
  }>("/match/status");
  return response.data.data;
}

/**
 * 통화 종료 후 상대방 프로필 조회
 * GET /match/result/{sessionId}
 */
export async function getMatchResult(sessionId: number): Promise<MatchResultData> {
  const response = await apiClient.get<{
    success: boolean;
    data: MatchResultData;
  }>(`/match/result/${sessionId}`);
  return response.data.data;
}
