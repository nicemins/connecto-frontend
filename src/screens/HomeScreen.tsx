import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.5, 200);
  
  // useAuthStore 구독 - user 정보가 변경되면 자동으로 리렌더링됨
  const me = useAuthStore((state) => state.me);

  const handleFindPartner = () => {
    navigation.navigate("Matching");
  };

  const handleGoToMyPage = () => {
    // 탭 네비게이션 내부에서 다른 탭으로 이동
    navigation.navigate("MyPage");
  };

  const nativeLang = me?.languages?.find((l) => l.type === "NATIVE")?.languageCode ?? null;
  const learningLang = me?.languages?.find((l) => l.type === "LEARNING")?.languageCode ?? null;
  const profileImageUrl = me?.profile?.profileImageUrl ?? null;

  const langFlag: Record<string, string> = {
    ko: "🇰🇷", en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳",
    es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪",
  };

  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8D5F2", "#D4E8F7", "#FFF0E8", "#FFF5E6"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-6">
          {/* 상단: 닉네임 인사말 + 언어 배지 */}
          <View className="mb-8 items-center gap-2">
            {me?.profile?.nickname && (
              <Text className="text-gray-700 text-base font-semibold">
                안녕하세요, {me.profile.nickname}님 👋
              </Text>
            )}
            <View className="flex-row items-center gap-2">
              {nativeLang ? (
                <View className="rounded-full bg-white/60 px-4 py-1.5 flex-row items-center gap-1">
                  <Text className="text-base">{langFlag[nativeLang] ?? "🌐"}</Text>
                  <Text className="text-sm font-semibold text-gray-700">{nativeLang.toUpperCase()}</Text>
                </View>
              ) : (
                <View className="rounded-full bg-gray-200/80 px-4 py-1.5">
                  <Text className="text-sm text-gray-500">언어 미설정</Text>
                </View>
              )}
              {learningLang && (
                <>
                  <Text className="text-gray-400 text-base">→</Text>
                  <View className="rounded-full bg-white/40 px-4 py-1.5 flex-row items-center gap-1">
                    <Text className="text-base">{langFlag[learningLang] ?? "🌐"}</Text>
                    <Text className="text-sm font-semibold text-gray-600">{learningLang.toUpperCase()}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 중앙: 메인 프로필 이미지 */}
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <Pressable
            onPress={handleGoToMyPage}
            className="mb-12 items-center"
          >
            <View
              style={[
                styles.characterBlob,
                { width: charSize, height: charSize, borderRadius: charSize / 2 },
              ]}
            >
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={[
                    styles.profileImage,
                    {
                      width: charSize,
                      height: charSize,
                      borderRadius: charSize / 2,
                    },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <>
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
                </>
              )}
            </View>
          </Pressable>
          </Animated.View>

          {/* 하단: Find Partner 버튼 */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }], width: "100%" }}>
          <Pressable
            onPress={handleFindPartner}
            className="h-14 w-full items-center justify-center rounded-2xl"
            style={styles.findPartnerButton}
          >
            <LinearGradient
              colors={["#B88FCE", "#F093A0", "#FFB88C"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              className="rounded-2xl"
            />
            <Text className="text-lg font-semibold text-white">Find Partner</Text>
          </Pressable>
          </Animated.View>

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
  profileImage: {
    position: "absolute",
  },
  findPartnerButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
