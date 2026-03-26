import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { refreshAccessToken } from "./auth";
import { navigationRef } from "../navigation/navigationRef";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:8080";

let socketInstance: Socket | null = null;
// SEC-H4: 무한 루프 방지 — 소켓 토큰 갱신 진행 중 플래그
let isRefreshingSocketToken = false;

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  // 소켓 인스턴스가 없을 때만 새로 생성
  // — 재연결 중(!connected)인 소켓을 파괴하면 다른 컴포넌트의 리스너가
  //   모두 사라지는 버그가 발생하므로, Socket.IO 내장 재연결에 맡긴다
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      // netty-socketio 2.0.3: auth 객체 미지원 → extraHeaders + query 사용
      query: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 재연결 시 최신 accessToken으로 extraHeaders + query 갱신
    socketInstance.on("reconnect_attempt", () => {
      const latestToken = useAuthStore.getState().accessToken;
      if (socketInstance && latestToken) {
        (socketInstance.io.opts as any).query = { token: latestToken };
        (socketInstance.io.opts as any).extraHeaders = {
          Authorization: `Bearer ${latestToken}`,
        };
      }
    });

    // SEC-H4: connect_error 시 인증 오류 감지 → 토큰 갱신 후 재연결
    socketInstance.on("connect_error", async (err) => {
      const errMsg = (err.message ?? "").toLowerCase();
      const isAuthError =
        errMsg.includes("auth") ||
        errMsg.includes("unauthorized") ||
        errMsg.includes("token") ||
        errMsg.includes("forbidden");

      if (isAuthError && !isRefreshingSocketToken) {
        isRefreshingSocketToken = true;
        try {
          const { refreshToken: storedRefreshToken, persistTokens } =
            useAuthStore.getState();
          if (!storedRefreshToken) throw new Error("No refresh token");

          const newToken = await refreshAccessToken(storedRefreshToken);
          await persistTokens(newToken);

          if (socketInstance) {
            (socketInstance.io.opts as any).query = { token: newToken };
            (socketInstance.io.opts as any).extraHeaders = {
              Authorization: `Bearer ${newToken}`,
            };
            socketInstance.disconnect().connect();
          }
        } catch {
          // 갱신 실패 → 로그아웃 후 Login 화면으로
          const { logout } = useAuthStore.getState();
          await logout();
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: "Login" as never }],
          });
        } finally {
          isRefreshingSocketToken = false;
        }
      } else if (!isAuthError) {
        if (__DEV__) console.warn("Socket connection error:", err.message);
      }
    });
  }

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
