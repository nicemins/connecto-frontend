import { useEffect, useRef, useState, useCallback } from "react";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { getSocket } from "../api/socket";
import { getTurnCredentials } from "../api/webrtc";
import { endCall } from "../api/call";
import type { Socket } from "socket.io-client";

// WebRTC 시그널링 타입 정의
type RTCSessionDescriptionInit = {
  type: "offer" | "answer";
  sdp: string;
};

// H-8: react-native-webrtc RTCPeerConnection 이벤트 핸들러 타입
type RTCPeerConnectionWithEvents = RTCPeerConnection & {
  ontrack: ((event: { streams: MediaStream[] }) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  onicecandidate: ((event: { candidate: { toJSON(): RTCIceCandidateInit } | null }) => void) | null;
  onicegatheringstatechange: (() => void) | null;
  onsignalingstatechange: (() => void) | null;
};

type RTCIceCandidateInit = {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
};

export type WebRTCState = {
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
};

type WebRTCHookParams = {
  sessionId: number;
  webrtcChannelId: string;
  isOfferer: boolean;
  remoteUserId?: string; // 상대방 사용자 ID (서버에서 제공될 수 있음)
  onCallEnd?: () => void;
};

export function useWebRTC({
  sessionId,
  webrtcChannelId,
  isOfferer,
  remoteUserId,
  onCallEnd,
}: WebRTCHookParams) {
  const [state, setState] = useState<WebRTCState>({
    isConnected: false,
    localStream: null,
    remoteStream: null,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isOffererRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const wasConnectedRef = useRef<boolean>(false); // ICE 한 번이라도 연결된 적 있는지
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null); // PC 준비 전 도착한 offer 버퍼

  // STUN only fallback (API 실패 시)
  const STUN_ONLY = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // 마이크 권한 확인 및 로컬 스트림 생성
  // react-native-webrtc의 getUserMedia는 자동으로 권한을 요청합니다
  const initializeLocalStream = useCallback(async () => {
    try {
      // 로컬 오디오 스트림 생성 (권한 요청 포함)
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));

      // PeerConnection에 로컬 트랙 추가
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, stream);
          }
        });
      }

      return stream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "마이크 접근 실패";
      if (__DEV__) console.error("initializeLocalStream error:", error);
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // PeerConnection 초기화 (TURN 자격증명 API 호출 포함)
  const initializePeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return;
    }

    try {
      // SEC-H1: 서버에서 단기 TURN 자격증명 조회, 실패 시 STUN only fallback
      let iceConfig = STUN_ONLY;
      try {
        const credentials = await getTurnCredentials();
        iceConfig = { iceServers: credentials.iceServers };
      } catch {
        if (__DEV__) console.warn("TURN credentials fetch failed, using STUN only");
      }

      // H-8: (pc as any) 대신 타입 단언 1회로 통일
      const pc = new RTCPeerConnection(iceConfig) as RTCPeerConnectionWithEvents;
      peerConnectionRef.current = pc;

      // 원격 스트림 수신 처리
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setState((prev) => ({ ...prev, remoteStream: event.streams[0] }));
        }
      };

      // ICE 연결 상태 변경
      pc.oniceconnectionstatechange = () => {
        const connectionState = pc.iceConnectionState;

        if (connectionState === "connected" || connectionState === "completed") {
          wasConnectedRef.current = true;
          setState((prev) => ({ ...prev, isConnected: true }));
        } else if (
          connectionState === "disconnected" ||
          connectionState === "failed" ||
          connectionState === "closed"
        ) {
          setState((prev) => ({ ...prev, isConnected: false }));
          // 한 번이라도 연결된 적 있을 때만 onCallEnd 호출
          // (에뮬레이터처럼 ICE가 처음부터 연결 안 된 경우 자동 종료 방지)
          if ((connectionState === "failed" || connectionState === "closed") && wasConnectedRef.current) {
            if (__DEV__) console.log(`[WebRTC] ICE ${connectionState} (was connected) → triggering onCallEnd`);
            onCallEnd?.();
          }
        }
      };

      // ICE Candidate 생성 시 전송
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("webrtc:ice", {
            channelId: webrtcChannelId,
            candidate: event.candidate.toJSON(),
            sessionId,
          });
        }
      };

      pc.onicegatheringstatechange = null;
      pc.onsignalingstatechange = null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "PeerConnection 초기화 실패";
      if (__DEV__) console.error("initializePeerConnection error:", error);
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, [sessionId, webrtcChannelId, remoteUserId]);

  // Offer 생성 및 전송
  const createOffer = useCallback(async () => {
    if (!peerConnectionRef.current) {
      throw new Error("PeerConnection이 초기화되지 않았습니다.");
    }

    try {
      const offer = await peerConnectionRef.current.createOffer();

      await peerConnectionRef.current.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit("webrtc:offer", {
          channelId: webrtcChannelId,
          sdp: { type: offer.type, sdp: offer.sdp },
          sessionId,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Offer 생성 실패";
      if (__DEV__) console.error("createOffer error:", error);
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [sessionId, webrtcChannelId, remoteUserId]);

  // Answer 생성 및 전송
  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!peerConnectionRef.current) {
        throw new Error("PeerConnection이 초기화되지 않았습니다.");
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        const answer = await peerConnectionRef.current.createAnswer();

        await peerConnectionRef.current.setLocalDescription(answer);

        if (socketRef.current) {
          socketRef.current.emit("webrtc:answer", {
            channelId: webrtcChannelId,
            sdp: { type: answer.type, sdp: answer.sdp },
            sessionId,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Answer 생성 실패";
        if (__DEV__) console.error("createAnswer error:", error);
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    [sessionId, webrtcChannelId, remoteUserId]
  );

  // WebRTC 초기화 및 연결 시작
  const startConnection = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    try {
      isInitializedRef.current = true;

      // Socket 연결
      const socket = getSocket();
      if (!socket) {
        throw new Error("Socket 연결을 가져올 수 없습니다.");
      }
      socketRef.current = socket;

      // 통화 채널 룸 진입 (시그널링 라우팅을 위해 join 먼저)
      socket.emit("webrtc:join", { channelId: webrtcChannelId, sessionId });

      // webrtc:offer 리스너를 join 직후 즉시 등록 — PC 준비 전 offer 도착 시 버퍼에 저장
      socket.on("webrtc:offer", async (data: { sdp: RTCSessionDescriptionInit; from?: string }) => {
        if (!peerConnectionRef.current) {
          if (__DEV__) console.log("[WebRTC] offer arrived before PC ready, buffering...");
          pendingOfferRef.current = data.sdp;
          return;
        }
        try {
          await createAnswer(data.sdp);
        } catch (error) {
          if (__DEV__) console.error("Error handling offer:", error);
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : "Offer 처리 실패",
          }));
        }
      });

      // PeerConnection 초기화 (await: TURN 자격증명 조회 포함)
      await initializePeerConnection();

      // 로컬 스트림 초기화
      await initializeLocalStream();

      // PC 준비 완료 후 버퍼된 offer 처리
      if (pendingOfferRef.current) {
        if (__DEV__) console.log("[WebRTC] Processing buffered offer...");
        try {
          await createAnswer(pendingOfferRef.current);
        } catch (error) {
          if (__DEV__) console.error("Error handling buffered offer:", error);
        }
        pendingOfferRef.current = null;
      }

      socket.on("webrtc:answer", async (data: { sdp: RTCSessionDescriptionInit; from?: string }) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );
          } catch (error) {
            if (__DEV__) console.error("Error setting remote description:", error);
            setState((prev) => ({
              ...prev,
              error: error instanceof Error ? error.message : "Answer 처리 실패",
            }));
          }
        }
      });

      socket.on("webrtc:ice", async (data: { candidate: RTCIceCandidateInit; from?: string }) => {
        if (peerConnectionRef.current && data.candidate && data.candidate.candidate) {
          try {
            const candidate = new (RTCIceCandidate as any)(data.candidate);
            await peerConnectionRef.current.addIceCandidate(candidate);
          } catch (error) {
            if (__DEV__) console.error("Error adding ICE candidate:", error);
            // ICE candidate 에러는 치명적이지 않으므로 상태 업데이트하지 않음
          }
        }
      });

      // 서버가 지정한 isOfferer만 Offer 생성
      if (__DEV__) console.log(`[WebRTC] startConnection isOfferer=${isOfferer} channelId=${webrtcChannelId}`);
      if (isOfferer) {
        isOffererRef.current = true;
        // answerer는 polling(최대 2초)으로 늦게 합류 → 3초 대기 후 offer 생성
        if (__DEV__) console.log("[WebRTC] Waiting 3s for answerer to join room...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (__DEV__) console.log("[WebRTC] Creating offer...");
        await createOffer();
        if (__DEV__) console.log("[WebRTC] Offer created and sent");
      } else {
        if (__DEV__) console.log("[WebRTC] Waiting for offer from remote peer...");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "WebRTC 초기화 실패";
      if (__DEV__) console.error("startConnection error:", error);
      setState((prev) => ({ ...prev, error: errorMessage }));
      isInitializedRef.current = false;
      // 서버 call 세션 정리 — 미호출 시 ALREADY_IN_CALL 잔존
      try { await endCall(sessionId); } catch { /* 세션 없으면 무시 */ }
    }
  }, [initializePeerConnection, initializeLocalStream, createOffer, sessionId]);

  // Cleanup: 모든 리소스 정리
  const cleanup = useCallback(() => {

    // 로컬 스트림 정리
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // PeerConnection 정리
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Socket 리스너 해제
    if (socketRef.current) {
      socketRef.current.off("webrtc:offer");
      socketRef.current.off("webrtc:answer");
      socketRef.current.off("webrtc:ice");
    }

    // 상태 초기화
    setState({
      isConnected: false,
      localStream: null,
      remoteStream: null,
      error: null,
    });

    isInitializedRef.current = false;
    isOffererRef.current = false;
    wasConnectedRef.current = false;
  }, []);

  // 컴포넌트 마운트 시 연결 시작
  useEffect(() => {
    startConnection();

    return () => {
      cleanup();
    };
  }, [startConnection, cleanup]);

  return {
    ...state,
    startConnection,
    cleanup,
  };
}
