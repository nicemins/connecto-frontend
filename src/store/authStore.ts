import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { UserMeResponse } from "../api/auth";

export type { UserMeResponse };

const ACCESS_TOKEN_KEY = "connecto_access_token";
const REFRESH_TOKEN_KEY = "connecto_refresh_token";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  me: UserMeResponse | null;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setMe: (me: UserMeResponse | null) => void;
  persistTokens: (accessToken: string, refreshToken?: string | null) => Promise<void>;
  loadTokens: () => Promise<{ accessToken: string | null; refreshToken: string | null }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  me: null,

  setAccessToken: (token) => set({ accessToken: token }),
  setRefreshToken: (token) => set({ refreshToken: token }),
  setMe: (me) => set({ me }),

  persistTokens: async (accessToken, refreshToken) => {
    set({ accessToken, ...(refreshToken !== undefined && { refreshToken }) });
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else if (refreshToken === null) {
      // null = 로그인 시 토큰 미발급 → 기존 stale token 삭제
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set((prev) => ({ ...prev, refreshToken: null }));
    }
    // undefined = 토큰 갱신 흐름(기존 유지)
  },

  loadTokens: async () => {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    set({ accessToken, refreshToken });
    return { accessToken, refreshToken };
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null, me: null });
  },
}));
