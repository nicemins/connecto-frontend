import { apiClient } from "./client";

/**
 * 백엔드 명세에 따라 엔드포인트 변경.
 * - /auth/social-login: { provider, token } (소셜 전용)
 * - /auth/login: 확장 시 { email, password } 또는 { provider, token } 등
 */
const SOCIAL_LOGIN_ENDPOINT = "/auth/social-login";

export type LoginSuccess = {
  accessToken: string;
};

/**
 * 소셜 로그인 (provider + id_token/access_token)
 * - 엔드포인트: /auth/social-login (명세에 따라 /auth/login 등으로 변경 가능)
 */
export async function login(
  provider: string,
  token: string
): Promise<LoginSuccess> {
  const { data } = await apiClient.post<{
    success: boolean;
    data: { accessToken: string };
    timestamp?: string;
  }>(SOCIAL_LOGIN_ENDPOINT, { provider, token });

  if (!data.success || !data.data?.accessToken) {
    throw new Error("로그인 응답에 accessToken이 없습니다.");
  }

  return { accessToken: data.data.accessToken };
}
