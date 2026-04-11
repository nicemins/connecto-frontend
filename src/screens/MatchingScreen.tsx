import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocketMatching } from "../hooks/useSocketMatching";
import { useEffect } from "react";
import CharacterBlob from "../components/CharacterBlob";

type MatchingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Matching"
>;

const RIPPLE_COUNT = 4;

export default function MatchingScreen() {
  const navigation = useNavigation<MatchingScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.4, 180);
  const { status, matchResult, error, startMatching, cancelMatching } =
    useSocketMatching();

  // 대기 경과 시간
  const [elapsed, setElapsed] = React.useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}초 대기 중`;
    return `${Math.floor(s / 60)}분 ${s % 60}초 대기 중`;
  };

  // 점 애니메이션
  const [dots, setDots] = React.useState("");
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Ripple 애니메이션
  const rippleAnims = React.useRef(
    Array.from({ length: RIPPLE_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = rippleAnims.map((anim, i) => {
      anim.setValue(0);
      return Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000 + i * 200,
          delay: i * 400,
          useNativeDriver: true,
        })
      );
    });
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [rippleAnims]);

  useEffect(() => {
    startMatching();
  }, [startMatching]);

  useEffect(() => {
    if (matchResult) {
      navigation.replace("Call", {
        sessionId: matchResult.sessionId,
        webrtcChannelId: matchResult.webrtcChannelId,
        isOfferer: matchResult.isOfferer,
      });
    }
  }, [matchResult, navigation]);

  const handleCancel = () => {
    cancelMatching();
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8D5F2", "#D4E8F7", "#FFF0E8"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">

          {/* 타이틀 */}
          <Text style={styles.title}>파트너 찾는 중</Text>
          <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>

          {/* 캐릭터 + Ripple 애니메이션 */}
          <View style={styles.characterWrapper}>
            <View
              style={[
                styles.characterContainer,
                { width: charSize + 100, height: charSize + 100 },
              ]}
            >
              {rippleAnims.map((anim, i) => {
                const scale = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.4 + i * 0.2],
                });
                const opacity = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                });
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.ripple,
                      {
                        width: charSize + 100,
                        height: charSize + 100,
                        borderRadius: (charSize + 100) / 2,
                        transform: [{ scale }],
                        opacity,
                      },
                    ]}
                  />
                );
              })}
              <CharacterBlob
                size={charSize}
                colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                style={{ zIndex: 10 }}
              />
            </View>
          </View>

          {/* 상태 텍스트 */}
          <Text style={styles.statusText}>
            새로운 인연을 찾고 있어요{dots}
          </Text>
          <Text style={styles.subText}>
            전 세계 누군가와 5분간 이야기해보세요
          </Text>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* 취소 버튼 */}
          <Pressable
            onPress={handleCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  elapsed: {
    fontSize: 13,
    color: "rgba(107,114,128,0.8)",
    marginBottom: 32,
  },
  characterWrapper: {
    marginBottom: 32,
    alignItems: "center",
  },
  characterContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ripple: {
    position: "absolute",
    backgroundColor: "rgba(184, 143, 206, 0.3)",
    borderWidth: 2,
    borderColor: "rgba(184, 143, 206, 0.5)",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 13,
    color: "rgba(107,114,128,0.7)",
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#EA580C",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 32,
    height: 52,
    width: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1.5,
    borderColor: "rgba(184,143,206,0.4)",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
});
