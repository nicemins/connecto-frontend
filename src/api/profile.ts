import { apiClient } from "./client";

export type CreateProfileRequest = {
  nickname: string;
  bio?: string;
  profileImageUrl?: string;
};

export type UpdateProfileRequest = {
  nickname: string;
  bio?: string;
};

export type ProfileResponse = {
  id: number;
  nickname: string;
  profileImageUrl?: string;
  bio?: string;
};

/**
 * 프로필 최초 생성 (신규 사용자)
 * POST /users/me/profile
 */
export async function createProfile(data: CreateProfileRequest): Promise<void> {
  await apiClient.post("/users/me/profile", data);
}

/**
 * 내 프로필 조회
 * GET /users/me/profile
 */
export async function getMyProfile(): Promise<ProfileResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: ProfileResponse;
  }>("/users/me/profile");
  return response.data.data;
}

/**
 * 닉네임 중복 확인
 * GET /profiles/exists?nickname=...
 */
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const response = await apiClient.get<{
    success: boolean;
    data: { available: boolean };
  }>("/profiles/exists", { params: { nickname } });
  return response.data.data.available;
}

/**
 * 프로필 정보 수정
 * PATCH /users/me/profile
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<void> {
  await apiClient.patch("/users/me/profile", data);
}

/**
 * 프로필 이미지 업데이트
 * PATCH /users/me/profile/image  (multipart/form-data)
 */
export async function updateProfileImage(imageUri: string): Promise<string> {
  const filename = imageUri.split("/").pop() ?? "image.jpg";
  const ext = (/\.(\w+)$/.exec(filename)?.[1] ?? "jpg").toLowerCase();
  // 백엔드 허용: image/jpeg, image/png, image/webp (image/jpg 불허)
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("image", { uri: imageUri, type, name: filename } as unknown as Blob);

  const response = await apiClient.patch<{
    success: boolean;
    data: { profileImageUrl: string };
  }>("/users/me/profile/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data.profileImageUrl;
}
