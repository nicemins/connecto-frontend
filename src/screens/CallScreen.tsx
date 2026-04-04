import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Alert,
  Animated,
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
const WAVE_COUNT = 6;

// 웨이브 설정 — 각 바의 최대 높이와 주기(ms)
const MY_WAVE_CONFIG = [
  { maxH: 18, duration: 620 },
  { maxH: 30, duration: 450 },
  { maxH: 22, duration: 710 },
  { maxH: 32, duration: 530 },
  { maxH: 20, duration: 670 },
  { maxH: 26, duration: 490 },
];
const PARTNER_WAVE_CONFIG = [
  { maxH: 26, duration: 540 },
  { maxH: 20, duration: 680 },
  { maxH: 32, duration: 460 },
  { maxH: 22, duration: 720 },
  { maxH: 30, duration: 510 },
  { maxH: 18, duration: 630 },
];

function WaveBars({
  config,
  color,
  active,
}: {
  config: typeof MY_WAVE_CONFIG;
  color: string;
  active: boolean;
}) {
  // scaleY 기반 애니메이션 — useNativeDriver: true 지원
  // height 대신 scaleY + translateY로 하단 고정 성장 효과 구현
  const anims = React.useRef(
    config.map((c) => new Animated.Value(4 / c.maxH))
  ).current;

  React.useEffect(() => {
    if (!active) {
      anims.forEach((a, i) => a.setValue(4 / config[i].maxH));
      return;
    }
    const animations = anims.map((anim, i) => {
      const minFrac = 4 / config[i].maxH;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: config[i].duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: minFrac,
            duration: config[i].duration,
            useNativeDriver: true,
          }),
        ])
      );
    });
    animations.forEach((a, i) => setTimeout(() => a.start(), i * 80));
    return () => animations.forEach((a) => a.stop());
  }, [active, anims, config]);

  return (
    <View style={styles.waveBars}>
      {anims.map((anim, i) => {
        const maxH = config[i].maxH;
        const minFrac = 4 / maxH;
        // translateY: 하단 고정 — scaleY로 줄어든 만큼 아래로 이동
        const translateY = anim.interpolate({
          inputRange: [minFrac, 1],
          outputRange: [(maxH / 2) * (1 - minFrac), 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                height: maxH,
                backgroundColor: color,
                opacity: active ? 0.9 : 0.3,
                transform: [{ translateY }, { scaleY: anim }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

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

  const getTotalTimeSeconds = React.useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.min(elapsed, TOTAL_SECONDS);
  }, [startTime]);

  const getTotalTimeFormatted = React.useCallback(() => {
    const totalSeconds = getTotalTimeSeconds();
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [getTotalTimeSeconds]);

  const handleEndCall = React.useCallback(
    async (reason?: string) => {
      if (isEndingRef.current) return;
      isEndingRef.current = true;
      setIsEnding(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        await endCall(sessionId, reason);
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;
        if (status !== 403 && status !== 409) {
          console.error("endCall error:", e);
          Alert.alert("오류", "통화 종료 중 오류가 발생했습니다.");
          isEndingRef.current = false;
          setIsEnding(false);
          return;
        }
      }
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

  React.useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleRemoteEnded = (data: { sessionId: number }) => {
      if (data.sessionId === sessionId) {
        handleEndCallRef.current("remote_ended");
      }
    };
    socket.on("call:ended", handleRemoteEnded);
    return () => { socket.off("call:ended", handleRemoteEnded); };
  }, [sessionId]);

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleRejected = (data: { sessionId: number }) => {
      if (data.sessionId === sessionId) {
        if (isEndingRef.current) return;
        isEndingRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        navigation.goBack();
      }
    };
    socket.on("call:rejected", handleRejected);
    return () => { socket.off("call:rejected", handleRejected); };
  }, [sessionId, navigation]);

  React.useEffect(() => {
    if (secondsLeft === 0 && !isEndingRef.current) {
      handleEndCall("timeout");
    }
  }, [secondsLeft, handleEndCall]);

  React.useEffect(() => {
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

  const elapsed = TOTAL_SECONDS - secondsLeft;
  const isLocked = elapsed < LOCK_SECONDS;
  const lockRemaining = LOCK_SECONDS - elapsed;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4C1D95", "#5B21B6", "#312E81", "#1E3A8A", "#1E40AF"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>

        {/* 상단: 타이머 + 연결 상태 */}
        <View style={styles.header}>
          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

          {/* 연결 상태 pill */}
          <View style={[styles.statusPill, isConnected ? styles.statusConnected : styles.statusConnecting]}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? "#10B981" : "#F59E0B" }]} />
            <Text style={styles.statusText}>
              {isConnected ? "연결됨" : "연결 중..."}
            </Text>
          </View>

          {webrtcError && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{webrtcError}</Text>
              <Pressable
                onPress={() => { cleanup(); startConnection(); }}
                disabled={isEnding}
                style={styles.reconnectBtn}
              >
                <Text style={styles.reconnectText}>재연결</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 중앙: 두 캐릭터 */}
        <View style={styles.charactersArea}>
          {/* 나 */}
          <View style={styles.characterSlot}>
            <CharacterBlob
              size={charSize}
              colors={["#FFB88C", "#F093A0", "#B88FCE"]}
            />
            <WaveBars
              config={MY_WAVE_CONFIG}
              color="#FFB88C"
              active={isConnected}
            />
            <Text style={styles.charLabel}>나</Text>
          </View>

          {/* 연결 심볼 */}
          <View style={styles.connector}>
            <Text style={styles.connectorText}>🎙️</Text>
          </View>

          {/* 상대방 */}
          <View style={styles.characterSlot}>
            <CharacterBlob
              size={charSize}
              colors={["#60A5FA", "#3B82F6", "#8B5CF6"]}
            />
            <WaveBars
              config={PARTNER_WAVE_CONFIG}
              color="#60A5FA"
              active={isConnected}
            />
            <Text style={styles.charLabel}>상대방</Text>
          </View>
        </View>

        {/* 하단: 종료 버튼 */}
        <View style={styles.footer}>
          {isLocked && (
            <View style={styles.lockRow}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockText}>{lockRemaining}초 후 종료 가능</Text>
            </View>
          )}
          <Pressable
            onPress={() => handleEndCall("user_cancel")}
            disabled={isEnding || isLocked}
            style={[
              styles.endButton,
              isLocked && styles.endButtonLocked,
              isEnding && styles.endButtonEnding,
            ]}
          >
            <Text style={styles.endButtonText}>
              {isEnding ? "종료 중..." : "통화 종료"}
            </Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  // Header
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  timer: {
    fontSize: 52,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  statusConnected: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  statusConnecting: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#FCA5A5",
    flex: 1,
    textAlign: "center",
  },
  reconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  reconnectText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  // Characters
  charactersArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  characterSlot: {
    alignItems: "center",
    flex: 1,
  },
  waveBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 16,
    height: 36,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  charLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 10,
    fontWeight: "500",
  },
  connector: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  connectorText: {
    fontSize: 28,
    opacity: 0.6,
  },
  // Footer
  footer: {
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 40,
    gap: 12,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockIcon: {
    fontSize: 12,
  },
  lockText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  endButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#EF4444",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonLocked: {
    backgroundColor: "rgba(107,114,128,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  endButtonEnding: {
    opacity: 0.6,
  },
  endButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
});
