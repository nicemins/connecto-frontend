import { apiClient } from "./client";

// ── Response Types ──────────────────────────────────────────────
export type AuthTokenResponse = {
  accessToken: string;
};

export type UserMeResponse = {
  user: {
    id: number;
    email: string;
    createdAt: string;
  };
  profile: {
    id: number;
    nickname: string;
    profileImageUrl?: string;
    bio?: string;
  } | null;
  languages: Array<{
    id: number;
    languageCode: string;
    type: "NATIVE" | "LEARNING";
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE";
  }>;
};

// ── Helpers ──────────────────────────────────────────────────────
function extractRefreshToken(
  setCookieHeader: string | string[] | undefined
): string | null {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(/refreshToken=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

// ── API Functions ─────────────────────────────────────────────────

/**
 * 회원가입
 * POST /auth/signup
 */
export async function signup(email: string, password: string): Promise<void> {
  await apiClient.post("/auth/signup", { email, password });
}

/**
 * 로그인
 * POST /auth/login
 * → accessToken (body) + refreshToken (Set-Cookie)
 */
export async function login(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const response = await apiClient.post<{
    success: boolean;
    data: AuthTokenResponse;
  }>("/auth/login", { email, password });

  const accessToken = response.data.data.accessToken;
  const refreshToken = extractRefreshToken(response.headers["set-cookie"]);

  return { accessToken, refreshToken };
}

/**
 * Access Token 갱신
 * POST /auth/refresh  (Cookie: refreshToken=...)
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const response = await apiClient.post<{
    success: boolean;
    data: AuthTokenResponse;
  }>(
    "/auth/refresh",
    {},
    { headers: { Cookie: `refreshToken=${refreshToken}` } }
  );
  return response.data.data.accessToken;
}

/**
 * 로그아웃
 * POST /auth/logout
 */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/**
 * 내 정보 조회 (프로필 + 언어 통합)
 * GET /users/me
 */
export async function getMe(): Promise<UserMeResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: UserMeResponse;
  }>("/users/me");
  return response.data.data;
}

/**
 * 회원 탈퇴 (soft delete)
 * DELETE /users/me
 */
export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/users/me");
}

/**
 * 이메일 중복 확인
 * GET /users/exists/email?email=...
 */
export async function checkEmailAvailable(email: string): Promise<boolean> {
  const response = await apiClient.get<{
    success: boolean;
    data: { available: boolean };
  }>("/users/exists/email", { params: { email } });
  return response.data.data.available;
}
