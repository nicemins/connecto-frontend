import type { Character } from "./characters";

/**
 * Mock 캐릭터 데이터
 * 백엔드 API가 준비되면 이 파일은 삭제하거나 실제 API 호출로 대체됩니다.
 */
export const MOCK_CHARACTERS: Character[] = [
  {
    id: 1,
    name: "기본 캐릭터",
    imageUrl: "https://via.placeholder.com/200/FFB88C/F093A0?text=Character+1",
    isUnlocked: true,
  },
  {
    id: 2,
    name: "파란 캐릭터",
    imageUrl: "https://via.placeholder.com/200/60A5FA/3B82F6?text=Character+2",
    isUnlocked: true,
  },
  {
    id: 3,
    name: "보라 캐릭터",
    imageUrl: "https://via.placeholder.com/200/B88FCE/8B5CF6?text=Character+3",
    isUnlocked: false,
    unlockCondition: "통화 10회 달성 시 해제됩니다",
  },
  {
    id: 4,
    name: "초록 캐릭터",
    imageUrl: "https://via.placeholder.com/200/10B981/059669?text=Character+4",
    isUnlocked: false,
    unlockCondition: "친구 5명 추가 시 해제됩니다",
  },
  {
    id: 5,
    name: "핑크 캐릭터",
    imageUrl: "https://via.placeholder.com/200/EC4899/DB2777?text=Character+5",
    isUnlocked: false,
    unlockCondition: "통화 50회 달성 시 해제됩니다",
  },
  {
    id: 6,
    name: "골드 캐릭터",
    imageUrl: "https://via.placeholder.com/200/F59E0B/D97706?text=Character+6",
    isUnlocked: false,
    unlockCondition: "프리미엄 구독 시 해제됩니다",
  },
];

/**
 * 네트워크 지연 시뮬레이션 헬퍼 함수
 * 300ms ~ 800ms 사이의 랜덤 지연 시간을 생성합니다.
 */
export function simulateNetworkDelay(min: number = 300, max: number = 800): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
