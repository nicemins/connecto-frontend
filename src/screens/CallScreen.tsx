import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";

import { endCall } from "../api/call";
import { getMatchResult } from "../api/match";
import { getSocket } from "../api/socket";
import { useWebRTC } from "../hooks/useWebRTC";
import CharacterBlob from "../components/CharacterBlob";

type CallScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Call"
>;

type CallScreenRouteProp = {
  key: string;
  name: "Call";
  params: {
    sessionId: number;
    webrtcChannelId: string;
    isOfferer: boolean;
  };
};

const TOTAL_SECONDS = 300; // 5분
const LOCK_SECONDS = 30;  // 입장 후 30초간 종료 버튼 잠금

export default function CallScreen() {
  const navigation = useNavigation<CallScreenNavigationProp>();
  const route = useRoute<CallScreenRouteProp>();
  const { sessionId, webrtcChannelId, isOfferer } = route.params;
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.35, 150);

  const [secondsLeft, setSecondsLeft] = React.useState(TOTAL_SECONDS);
  const [isEnding, setIsEnding] = React.useState(false);
  const [startTime] = React.useState(Date.now());
  const isEndingRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = React.useRef(true);
  const handleEndCallRef = React.useRef<(reason?: string) => void>(() => {});

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const { isConnected, error: webrtcError, startConnection, cleanup } = useWebRTC({
    sessionId,
    webrtcChannelId,
    isOfferer,
    onCallEnd: () => handleEndCallRef.current("remote_ended"),
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 실제 통화 시간 계산 (초 단위)
  const getTotalTimeSeconds = React.useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.min(elapsed, TOTAL_SECONDS); // 최대 5분
  }, [startTime]);

  // 통화 시간을 MM:SS 형식으로 변환
  const getTotalTimeFormatted = React.useCallback(() => {
    const totalSeconds = getTotalTimeSeconds();
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [getTotalTimeSeconds]);

  const handleEndCall = React.useCallback(
    async (reason?: string) => {
      // H-3: isEndingRef로 race condition 방지 (state 비동기 업데이트 문제 해결)
      if (isEndingRef.current) return;
      isEndingRef.current = true;
      setIsEnding(true);

      // H-2: 타이머 즉시 정리
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        await endCall(sessionId, reason);
      } catch (e: any) {
        // 403 ACCESS_DENIED = 상대방이 먼저 종료 → 세션은 ENDED, 정상 진행
        // 409 INVALID_SESSION_STATE = 이미 종료된 세션 → 동일하게 MatchResult로 이동
        const status = e?.response?.status ?? e?.status;
        if (status !== 403 && status !== 409) {
          console.error("endCall error:", e);
          Alert.alert("오류", "통화 종료 중 오류가 발생했습니다.");
          isEndingRef.current = false;
          setIsEnding(false);
          return;
        }
      }
      // endCall 성공(200) or 상대방 먼저 종료(403) 모두 MatchResult로 이동
      try {
        const totalTime = getTotalTimeFormatted();
        const matchResult = await getMatchResult(sessionId).catch(() => null);
        navigation.replace("MatchResult", {
          sessionId,
          partnerId: matchResult ? String(matchResult.profile.id) : undefined,
          totalTime,
        });
      } catch (e) {
        console.error("navigate to MatchResult error:", e);
        isEndingRef.current = false;
        setIsEnding(false);
      }
    },
    [sessionId, navigation, getTotalTimeFormatted]
  );

  // handleEndCallRef 최신 함수로 유지
  React.useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);

  // call:ended 소켓 수신 — 상대방이 먼저 종료 시 자동 이동
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRemoteEnded = (data: { sessionId: number }) => {
      if (data.sessionId === sessionId) {
        if (__DEV__) console.log("[CallScreen] call:ended received, ending call");
        handleEndCallRef.current("remote_ended");
      }
    };

    socket.on("call:ended", handleRemoteEnded);
    return () => {
      socket.off("call:ended", handleRemoteEnded);
    };
  }, [sessionId]);

  // 타이머가 00:00이 되었을 때 자동으로 종료 처리
  React.useEffect(() => {
    if (secondsLeft === 0 && !isEndingRef.current) {
      handleEndCall("timeout");
    }
  }, [secondsLeft, handleEndCall]);

  // 타이머 카운트다운 (마운트 시 한 번만 실행)
  React.useEffect(() => {
    // H-2: timerRef에 저장해 handleEndCall에서 즉시 정리 가능하도록
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4C1D95", "#5B21B6", "#312E81", "#1E3A8A", "#1E40AF"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1">
          {/* 상단: 타이머 + 연결 상태 */}
          <View className="items-center pt-6 pb-4">
            <Text className="text-4xl font-bold text-white">
              {formatTime(secondsLeft)}
            </Text>
            <View className="flex-row items-center mt-2 gap-1">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isConnected ? "#10B981" : "#F59E0B",
                }}
              />
              <Text className="text-xs text-white/70">
                {isConnected ? "연결됨" : "연결 중..."}
              </Text>
            </View>
            {webrtcError && (
              <>
                <Text className="text-xs text-red-300 mt-1 text-center px-4">
                  {webrtcError}
                </Text>
                <Pressable
                  onPress={() => { cleanup(); startConnection(); }}
                  disabled={isEnding}
                  className="mt-2 px-4 py-1 rounded-full border border-white/40 disabled:opacity-40"
                >
                  <Text className="text-xs text-white/80">재연결</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* 중앙: 두 캐릭터 마주보기 */}
          <View className="flex-1 items-center justify-center px-6">
            <View className="flex-row items-center justify-center gap-8">
              {/* 왼쪽 캐릭터 */}
              <View className="items-center">
                <CharacterBlob
                  size={charSize}
                  colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                />
                {/* 보이스 비주얼라이저 (파동) */}
                <View className="mt-4 flex-row gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    // 각 바마다 다른 불규칙한 파동 패턴
                    const wavePatterns = [
                      [8, 30, 15, 25, 8],
                      [8, 20, 28, 12, 8],
                      [8, 25, 18, 30, 8],
                      [8, 22, 15, 28, 8],
                      [8, 28, 20, 15, 8],
                      [8, 18, 30, 22, 8],
                    ];
                    return (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            width: 4,
                            height: wavePatterns[i][2],
                            backgroundColor: "#FFB88C",
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* 오른쪽 캐릭터 */}
              <View className="items-center">
                <CharacterBlob
                  size={charSize}
                  colors={["#60A5FA", "#3B82F6", "#8B5CF6"]}
                />
                {/* 보이스 비주얼라이저 (파동) */}
                <View className="mt-4 flex-row gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    // 각 바마다 다른 불규칙한 파동 패턴
                    const wavePatterns = [
                      [8, 28, 12, 30, 8],
                      [8, 22, 25, 15, 8],
                      [8, 30, 18, 22, 8],
                      [8, 20, 28, 18, 8],
                      [8, 25, 15, 30, 8],
                      [8, 18, 28, 20, 8],
                    ];
                    return (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            width: 4,
                            height: wavePatterns[i][2],
                            backgroundColor: "#60A5FA",
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* 하단: 종료 버튼 */}
          {(() => {
            const elapsed = TOTAL_SECONDS - secondsLeft;
            const isLocked = elapsed < LOCK_SECONDS;
            const lockRemaining = LOCK_SECONDS - elapsed;
            return (
              <View className="items-center pb-8">
                {isLocked && (
                  <Text className="text-xs text-white/60 mb-2">
                    {lockRemaining}초 후 종료 가능
                  </Text>
                )}
                <Pressable
                  onPress={() => handleEndCall("user_cancel")}
                  disabled={isEnding || isLocked}
                  className="h-14 w-32 items-center justify-center rounded-full disabled:opacity-40"
                  style={{ backgroundColor: isLocked ? "#6B7280" : "#EF4444" }}
                >
                  <Text className="text-lg font-semibold text-white">종료</Text>
                </Pressable>
              </View>
            );
          })()}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  waveBar: {
    borderRadius: 2,
  },
});
