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

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = (data: IncomingCallData) => {
      if (__DEV__) console.log("[IncomingCall] call:incoming received", data);
      setIncomingCall(data);
    };

    socket.on("call:incoming", handleIncoming);
    return () => {
      socket.off("call:incoming", handleIncoming);
    };
  }, [accessToken]);

  const dismiss = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return { incomingCall, dismiss };
}
