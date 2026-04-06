import { useEffect, useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { getSocket } from "../api/socket";
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
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const startMatching = useCallback(async () => {
    setStatus("matching");
    setError(null);
    setMatchResult(null);

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket) {
      Alert.alert("연결 오류", "서버와의 소켓 연결이 없습니다. 잠시 후 다시 시도해주세요.");
      setError("소켓 연결 없음");
      setStatus("idle");
      return;
    }

    // 리스너 먼저 등록
    socket.on("match:success", (data: MatchSuccessPayload) => {
      if (__DEV__) console.log("[Match] match:success received, isOfferer=", data.isOfferer, "sessionId=", data.sessionId);
      setMatchResult(data);
      setStatus("matched");
    });

    socket.on("match:error", (err: { code: string; message: string }) => {
      console.error("Match error:", err);
      setError(err.message || "매칭에 실패했습니다.");
      setStatus("error");
      Alert.alert("매칭 오류", err.message || "매칭에 실패했습니다. 다시 시도해주세요.");
    });

    socket.on("disconnect", () => {
      console.warn("[Match] Socket disconnected during matching");
      setError("서버 연결이 끊겼습니다.");
      setStatus("error");
      Alert.alert("연결 끊김", "서버와의 연결이 끊겼습니다. 다시 시도해주세요.");
    });

    // 리스너 등록 후 REST 호출
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { matched: boolean; sessionId?: number; webrtcChannelId?: string };
      }>("/match/start");

      // REST가 matched:true → 이 유저가 매칭 트리거 = offerer
      if (data.success && data.data.matched && data.data.sessionId && data.data.webrtcChannelId) {
        if (__DEV__) console.log("[Match] REST matched immediately, isOfferer=true, sessionId=", data.data.sessionId);
        setMatchResult({ sessionId: data.data.sessionId, webrtcChannelId: data.data.webrtcChannelId, isOfferer: true });
        setStatus("matched");
        socket.off("match:success");
        socket.off("match:error");
        socket.off("disconnect");
        return;
      }
    } catch (e) {
      console.error("match/start REST error:", e);
      socket.off("match:success");
      socket.off("match:error");
      socket.off("disconnect");
      setError("매칭 시작 실패");
      setStatus("idle");
      Alert.alert("오류", "매칭을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 대기 중 — 소켓 match:success 수신 대기
    socket.emit("match:start");
  }, []);

  const cancelMatching = useCallback(async () => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit("match:cancel");
      socket.off("match:success");
      socket.off("match:error");
      socket.off("disconnect");
    }

    try {
      await apiClient.post("/match/cancel");
    } catch (e) {
      console.error("Cancel matching error:", e);
    }

    setStatus("idle");
    setError(null);
    setMatchResult(null);
  }, []);

  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.off("match:success");
        socket.off("match:error");
        socket.off("disconnect");
      }
    };
  }, []);

  return {
    status,
    matchResult,
    error,
    startMatching,
    cancelMatching,
  };
}
