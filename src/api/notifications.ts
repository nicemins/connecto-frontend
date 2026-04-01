import { apiClient } from "./client";

export type DeviceTokenResponse = {
  success: boolean;
};

/**
 * FCM 디바이스 토큰 등록/갱신
 * POST /users/me/device-token
 */
export async function registerDeviceToken(
  token: string,
  platform: "android" | "ios"
): Promise<DeviceTokenResponse> {
  const { data } = await apiClient.post<DeviceTokenResponse>(
    "/users/me/device-token",
    { token, platform }
  );
  return data;
}
