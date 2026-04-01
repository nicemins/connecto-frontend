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

  // Ripple 애니메이션 (moti 대신 React Native Animated 사용)
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
              {/* Ripple 애니메이션 */}
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

              {/* 메인 캐릭터 */}
              <CharacterBlob
                size={charSize}
                colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                style={{ zIndex: 10 }}
              />
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
});
