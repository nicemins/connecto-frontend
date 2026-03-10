import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket, disconnectSocket } from "../api/socket";
import { apiClient } from "../api/client";

export type MatchResult = {
  sessionId: number;
  webrtcChannelId: string;
  isOfferer: boolean;
};

// 백엔드 match:success 페이로드
type MatchSuccessPayload = {
  sessionId: number;
  webrtcChannelId: string;
  isOfferer: boolean;
};

type MatchStatus = "idle" | "matching" | "matched" | "error";

export function useSocketMatching() {
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get<{
          success: boolean;
          data: { status: string; sessionId?: number; webrtcChannelId?: string };
        }>("/match/status");

        if (data.success && data.data.status === "MATCHED") {
          if (data.data.sessionId && data.data.webrtcChannelId) {
            setMatchResult({
              sessionId: data.data.sessionId,
              webrtcChannelId: data.data.webrtcChannelId,
              isOfferer: false, // 폴링 fallback은 isOfferer 미지원 — 기본 false
            });
            setStatus("matched");
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startMatching = useCallback(async () => {
    setStatus("matching");
    setError(null);
    setMatchResult(null);

    try {
      await apiClient.post("/match/start");
    } catch (e) {
      console.error("match/start REST error:", e);
      setError("매칭 시작 실패");
      setStatus("idle");
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket) {
      setError("Socket connection failed. Using polling fallback.");
      startPolling();
      return;
    }

    socket.emit("match:start");

    socket.on("match:success", (data: MatchSuccessPayload) => {
      setMatchResult(data);
      setStatus("matched");
      stopPolling();
    });

    socket.on("match:error", (err: { message: string }) => {
      console.error("Match error:", err);
      setError(err.message || "Matching failed. Using polling fallback.");
      stopPolling();
      startPolling();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected during matching. Using polling fallback.");
      stopPolling();
      startPolling();
    });
  }, [startPolling, stopPolling]);

  const cancelMatching = useCallback(async () => {
    stopPolling();

    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit("match:cancel");
      socket.off("match:success");
      socket.off("match:error");
    }

    try {
      await apiClient.post("/match/cancel");
    } catch (e) {
      console.error("Cancel matching error:", e);
    }

    setStatus("idle");
    setError(null);
    setMatchResult(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
      const socket = socketRef.current;
      if (socket) {
        socket.off("match:success");
        socket.off("match:error");
        socket.off("disconnect"); // H-4: disconnect 리스너도 정리
      }
    };
  }, [stopPolling]);

  return {
    status,
    matchResult,
    error,
    startMatching,
    cancelMatching,
  };
}
