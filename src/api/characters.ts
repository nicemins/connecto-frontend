import { apiClient } from "./client";

export type Character = {
  id: number;
  name: string;
  imageUrl: string;
  isUnlocked: boolean;
  unlockCondition?: string;
};

/**
 * 캐릭터 목록 조회
 * GET /characters
 */
export async function getCharacters(): Promise<Character[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Character[] }>("/characters");
  return data.data;
}
