import { apiClient } from "./client";

export type Character = {
  id: number;
  name: string;
  imageUrl: string;
  isUnlocked: boolean;
  unlockCondition?: string;
};

export type CharactersResponse = {
  success: boolean;
  data: Character[];
};

/**
 * 캐릭터 목록 조회
 * GET /characters
 */
export async function getCharacters(): Promise<CharactersResponse> {
  const { data } = await apiClient.get<CharactersResponse>("/characters");
  return data;
}
