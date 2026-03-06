import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { useSocketMatching } from "../hooks/useSocketMatching";
import { useEffect } from "react";

type MatchingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Matching"
>;

export default function MatchingScreen() {
  const navigation = useNavigation<MatchingScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.4, 180);
  const { status, matchResult, error, startMatching, cancelMatching } =
    useSocketMatching();

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
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-8 text-2xl font-bold text-gray-800">
            Matching
          </Text>

          {/* 캐릭터 + Ripple 애니메이션 */}
          <View className="mb-8 items-center">
            <View
              style={[
                styles.characterContainer,
                { width: charSize + 100, height: charSize + 100 },
              ]}
            >
              {/* Ripple 애니메이션 (여러 개) */}
              {[0, 1, 2, 3].map((i) => (
                <MotiView
                  key={i}
                  from={{ scale: 0.8, opacity: 0.6 }}
                  animate={{
                    scale: 1.4 + i * 0.2,
                    opacity: 0,
                  }}
                  transition={{
                    type: "timing",
                    duration: 2000 + i * 200,
                  } as any}
                  {...({ repeat: Infinity as any } as any)}
                  style={[
                    styles.ripple,
                    {
                      width: charSize + 100,
                      height: charSize + 100,
                      borderRadius: (charSize + 100) / 2,
                    },
                  ]}
                />
              ))}

              {/* 메인 캐릭터 */}
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
            </View>
          </View>

          {/* 텍스트 */}
          <Text className="mb-2 text-center text-lg text-gray-700">
            Searching for partner...
          </Text>
          {error && (
            <Text className="mb-4 text-center text-sm text-orange-600">
              {error}
            </Text>
          )}

          {/* Cancel 버튼 */}
          <Pressable
            onPress={handleCancel}
            className="mt-8 h-12 w-48 items-center justify-center rounded-2xl border-2 border-gray-300 bg-white"
          >
            <Text className="text-base font-semibold text-gray-700">
              Cancel
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  characterBlob: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
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
});
