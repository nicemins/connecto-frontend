import { apiClient } from "./client";

export type LanguageType = "NATIVE" | "LEARNING";
export type LanguageLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE";

export type LanguageRequest = {
  languageCode: string;
  type: LanguageType;
  level: LanguageLevel;
};

export type LanguageItem = {
  id: number;
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
 * 언어 목록 조회
 * GET /users/me/languages
 */
export async function getLanguages(): Promise<LanguageItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: LanguageItem[] }>("/users/me/languages");
  return data.data ?? [];
}

/**
 * 언어 전체 교체
 * PUT /users/me/languages
 */
export async function updateLanguages(languages: LanguageRequest[]): Promise<void> {
  await apiClient.put("/users/me/languages", languages);
}

/**
 * 언어 삭제
 * DELETE /users/me/languages/{id}
 */
export async function deleteLanguage(id: number): Promise<void> {
  await apiClient.delete(`/users/me/languages/${id}`);
}

type InterestItem = { id: number; tag: string };

/**
 * 관심사 조회
 * GET /users/me/interests → [{ id, tag }]
 */
export async function getInterests(): Promise<string[]> {
  const { data } = await apiClient.get<{ success: boolean; data: InterestItem[] }>("/users/me/interests");
  return (data.data ?? []).map((item) => item.tag);
}

/**
 * 관심사 저장 (전체 교체)
 * - 기존 관심사 삭제 (DELETE /users/me/interests/{id})
 * - 새 관심사 추가 (POST /users/me/interests, { tag })
 */
export async function saveInterests(newTags: string[]): Promise<void> {
  // 현재 관심사 조회 (id 포함)
  const { data: current } = await apiClient.get<{ success: boolean; data: InterestItem[] }>("/users/me/interests");
  const currentList: InterestItem[] = current.data ?? [];

  // 삭제할 항목 (현재에 있지만 새 목록에 없는 것)
  const toDelete = currentList.filter((item) => !newTags.includes(item.tag));
  // 추가할 항목 (새 목록에 있지만 현재에 없는 것)
  const existingTags = currentList.map((item) => item.tag);
  const toAdd = newTags.filter((tag) => !existingTags.includes(tag));

  await Promise.all(toDelete.map((item) => apiClient.delete(`/users/me/interests/${item.id}`)));
  await Promise.all(
    toAdd.map((tag) =>
      apiClient.post("/users/me/interests", { tag }).catch((e) => {
        // 409: 이미 등록된 관심사 — 무시
        if (e?.response?.status !== 409) throw e;
      })
    )
  );
}
