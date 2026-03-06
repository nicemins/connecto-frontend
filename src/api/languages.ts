import { apiClient } from "./client";

export type LanguageType = "NATIVE" | "LEARNING";
export type LanguageLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE";

export type LanguageRequest = {
  languageCode: string;
  type: LanguageType;
  level: LanguageLevel;
};

/**
 * 언어 설정 저장
 * POST /users/me/languages
 */
export async function saveLanguage(data: LanguageRequest): Promise<void> {
  await apiClient.post("/users/me/languages", data);
}

/**
 * 관심사 조회
 * GET /users/me/interests
 */
export async function getInterests(): Promise<string[]> {
  const { data } = await apiClient.get<{ success: boolean; data: { interests: string[] } }>("/users/me/interests");
  return data.data.interests ?? [];
}

/**
 * 관심사 저장
 * POST /users/me/interests
 */
export async function saveInterests(interests: string[]): Promise<void> {
  await apiClient.post("/users/me/interests", { interests });
}
