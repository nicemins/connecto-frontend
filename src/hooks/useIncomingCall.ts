import { useState, useEffect, useCallback } from "react";
import { getSocket } from "../api/socket";
import { useAuthStore } from "../store/authStore";


export type IncomingCallData = {
  sessionId: number;
  webrtcChannelId: string;
  callerId: number;
  callerNickname: string;
};

export function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateFriendOnline = useAuthStore((state) => state.updateFriendOnline);

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = (data: IncomingCallData) => {
      if (__DEV__) console.log("[IncomingCall] call:incoming received", data);
      setIncomingCall(data);
    };

    // 소켓 연결 직후 서버가 push하는 친구 온라인 상태를 전역 스토어에 저장
    // — 이 훅은 App.tsx에서 마운트되므로 ChatListScreen/FriendListScreen보다 먼저 이벤트 수신
    const handleFriendStatus = (data: { friendId: number; isOnline: boolean }) => {
      updateFriendOnline(data.friendId, data.isOnline);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("friend:status-change", handleFriendStatus);
    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("friend:status-change", handleFriendStatus);
    };
  }, [accessToken, updateFriendOnline]);

  const dismiss = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return { incomingCall, dismiss };
}
