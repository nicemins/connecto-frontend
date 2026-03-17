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

    // 소켓 리스너를 REST 호출 전에 먼저 등록 (race condition 방지)
    // REST /match/start 응답 전에 서버가 match:success를 소켓으로 보낼 수 있음
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket) {
      // 소켓 없으면 REST만 호출 후 polling fallback
      try {
        await apiClient.post("/match/start");
      } catch (e) {
        setError("매칭 시작 실패");
        setStatus("idle");
        return;
      }
      setError("Socket connection failed. Using polling fallback.");
      startPolling();
      return;
    }

    // 리스너 먼저 등록
    socket.on("match:success", (data: MatchSuccessPayload) => {
      if (__DEV__) console.log("[Match] match:success received, isOfferer=", data.isOfferer, "sessionId=", data.sessionId);
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

    // 리스너 등록 후 REST 호출
    let restMatched = false;
    let restSessionId: number | null = null;
    let restChannelId: string | null = null;
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { matched: boolean; sessionId?: number; webrtcChannelId?: string };
      }>("/match/start");
      // REST가 matched:true → 이 유저가 매칭 트리거 = offerer
      if (data.success && data.data.matched && data.data.sessionId && data.data.webrtcChannelId) {
        restMatched = true;
        restSessionId = data.data.sessionId;
        restChannelId = data.data.webrtcChannelId;
        if (__DEV__) console.log("[Match] REST matched immediately, isOfferer=true, sessionId=", restSessionId);
      }
    } catch (e) {
      console.error("match/start REST error:", e);
      socket.off("match:success");
      socket.off("match:error");
      socket.off("disconnect");
      setError("매칭 시작 실패");
      setStatus("idle");
      return;
    }

    // REST가 즉시 매칭 → offerer로 바로 CallScreen 진입
    if (restMatched && restSessionId && restChannelId) {
      setMatchResult({ sessionId: restSessionId, webrtcChannelId: restChannelId, isOfferer: true });
      setStatus("matched");
      socket.off("match:success");
      socket.off("match:error");
      socket.off("disconnect");
      return;
    }

    socket.emit("match:start");

    // 소켓 match:success 유실 대비 안전망 polling (isOfferer: false — 대기 유저)
    startPolling();
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
