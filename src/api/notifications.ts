import { apiClient } from "./client";

export type PushTokenUpdateResponse = {
  success: boolean;
  data?: {
    pushToken: string;
  };
};

/**
 * 푸시 토큰 업데이트
 * POST /user/push-token
 */
export async function updatePushToken(
  pushToken: string
): Promise<PushTokenUpdateResponse> {
  const { data } = await apiClient.post<PushTokenUpdateResponse>(
    "/user/push-token",
    { pushToken }
  );
  return data;
}
