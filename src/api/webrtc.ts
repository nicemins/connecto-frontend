import { apiClient } from "./client";

type RTCIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

type TurnCredentials = {
  iceServers: RTCIceServer[];
  ttl: number;
};

/**
 * GET /webrtc/turn-credentials
 * 단기 TURN 서버 자격증명 조회
 */
export async function getTurnCredentials(): Promise<TurnCredentials> {
  const response = await apiClient.get<{ success: boolean; data: TurnCredentials }>(
    "/webrtc/turn-credentials"
  );
  return response.data.data;
}
