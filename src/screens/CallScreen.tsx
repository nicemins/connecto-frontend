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
import { MotiView } from "moti";
import { endCall } from "../api/call";
import { getMatchResult } from "../api/match";
import { useWebRTC } from "../hooks/useWebRTC";

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

  const { isConnected, error: webrtcError, startConnection, cleanup } = useWebRTC({
    sessionId,
    webrtcChannelId,
    isOfferer,
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
      if (isEnding) return;
      setIsEnding(true);

      try {
        await endCall(sessionId, reason);
      } catch (e) {
        console.error("endCall error:", e);
      } finally {
        setIsEnding(false);
      }
      // 통화 종료 후 결과 조회 (상대방 프로필 공개)
      const totalTime = getTotalTimeFormatted();
      const matchResult = await getMatchResult(sessionId).catch(() => null);
      navigation.replace("MatchResult", {
        sessionId,
        partnerId: matchResult ? String(matchResult.profile.id) : undefined,
        totalTime,
      });
    },
    [sessionId, isEnding, navigation, getTotalTimeFormatted]
  );

  // 타이머가 00:00이 되었을 때 자동으로 종료 처리
  React.useEffect(() => {
    if (secondsLeft === 0 && !isEnding) {
      handleEndCall("timeout");
    }
  }, [secondsLeft, isEnding, handleEndCall]);

  // 타이머 카운트다운 (마운트 시 한 번만 실행)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
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
                  className="mt-2 px-4 py-1 rounded-full border border-white/40"
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
                <View
                  style={[
                    styles.characterBlob,
                    { width: charSize, height: charSize, borderRadius: charSize / 2 },
                  ]}
                >
                  <LinearGradient
                    colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                    locations={[0, 0.5, 1]}
                    style={[
                      styles.characterGradient,
                      { borderRadius: charSize / 2 },
                    ]}
                  />
                  <View style={[styles.faceRow, { top: charSize * 0.38 }]}>
                    <View style={styles.eyes}>
                      <View style={styles.eye} />
                      <View style={styles.eye} />
                    </View>
                  </View>
                  <View style={[styles.faceRow, { top: charSize * 0.52 }]}>
                    <View style={styles.mouth} />
                  </View>
                </View>
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
                      <MotiView
                        key={i}
                        from={{ height: 8, opacity: 0.4 }}
                        animate={{
                          height: wavePatterns[i],
                          opacity: [0.4, 1, 0.7, 1, 0.4],
                        }}
                        transition={{
                          type: "timing",
                          duration: 800 + i * 100,
                          delay: i * 100, // 각 막대마다 다른 delay로 파도 효과
                        } as any}
                        {...({ repeat: Infinity as any } as any)}
                        style={[
                          styles.waveBar,
                          {
                            width: 4,
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
                <View
                  style={[
                    styles.characterBlob,
                    { width: charSize, height: charSize, borderRadius: charSize / 2 },
                  ]}
                >
                  <LinearGradient
                    colors={["#60A5FA", "#3B82F6", "#8B5CF6"]}
                    locations={[0, 0.5, 1]}
                    style={[
                      styles.characterGradient,
                      { borderRadius: charSize / 2 },
                    ]}
                  />
                  <View style={[styles.faceRow, { top: charSize * 0.38 }]}>
                    <View style={styles.eyes}>
                      <View style={styles.eye} />
                      <View style={styles.eye} />
                    </View>
                  </View>
                  <View style={[styles.faceRow, { top: charSize * 0.52 }]}>
                    <View style={styles.mouth} />
                  </View>
                </View>
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
                      <MotiView
                        key={i}
                        from={{ height: 8, opacity: 0.4 }}
                        animate={{
                          height: wavePatterns[i],
                          opacity: [0.4, 1, 0.7, 1, 0.4],
                        }}
                        transition={{
                          type: "timing",
                          duration: 900 + i * 120,
                          delay: i * 120, // 각 막대마다 다른 delay로 파도 효과
                        } as any}
                        {...({ repeat: Infinity as any } as any)}
                        style={[
                          styles.waveBar,
                          {
                            width: 4,
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
  characterBlob: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  characterGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  faceRow: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 11,
  },
  eyes: {
    flexDirection: "row",
    gap: 12,
  },
  eye: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1f2937",
  },
  mouth: {
    width: 24,
    height: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: "#374151",
  },
  waveBar: {
    borderRadius: 2,
  },
});
