import axios, { type AxiosError } from "axios";
import { useAuthStore } from "../store/authStore";
import { resetToLogin } from "../navigation/navigationRef";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && err.config?.headers?.Authorization) {
      useAuthStore.getState().logout();
      resetToLogin();
    }
    return Promise.reject(err);
  }
);
