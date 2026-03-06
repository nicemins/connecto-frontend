import * as React from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../api/auth";
import { saveLanguage } from "../api/languages";

type Nav = NativeStackNavigationProp<RootStackParamList, "LanguageSetup">;

const LANGUAGES = ["ko", "en", "ja", "zh", "es", "fr", "de"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export default function LanguageSetupScreen() {
  const navigation = useNavigation<Nav>();
  const { setMe } = useAuthStore();
  const [nativeLang, setNativeLang] = React.useState<string | null>(null);
  const [learningLang, setLearningLang] = React.useState<string | null>(null);
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]>("BEGINNER");
  const [loading, setLoading] = React.useState(false);

  const handleDone = async () => {
    if (!nativeLang) {
      Alert.alert("선택 필요", "모국어를 선택해주세요.");
      return;
    }
    if (!learningLang) {
      Alert.alert("선택 필요", "학습 언어를 선택해주세요.");
      return;
    }
    setLoading(true);
    try {
      await saveLanguage({ languageCode: nativeLang, type: "NATIVE", level: "NATIVE" });
      await saveLanguage({ languageCode: learningLang, type: "LEARNING", level });
      const me = await getMe();
      setMe(me);
      navigation.replace("InterestsSetup");
    } catch {
      Alert.alert("오류", "언어 설정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8D5F2", "#D4E8F7", "#FFF0E8", "#FFF5E6"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-bold text-gray-800 mt-8 mb-2">언어 설정</Text>
          <Text className="text-sm text-gray-500 mb-8">사용할 언어를 선택해주세요</Text>

          <Text className="text-base font-semibold text-gray-700 mb-3">모국어</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => setNativeLang(lang)}
                className="px-4 py-2 rounded-full"
                style={[styles.chip, nativeLang === lang && styles.chipSelected]}
              >
                <Text style={nativeLang === lang ? styles.chipTextSelected : styles.chipText}>
                  {lang.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-base font-semibold text-gray-700 mb-3">학습 언어</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => setLearningLang(lang)}
                className="px-4 py-2 rounded-full"
                style={[styles.chip, learningLang === lang && styles.chipSelected]}
              >
                <Text style={learningLang === lang ? styles.chipTextSelected : styles.chipText}>
                  {lang.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-base font-semibold text-gray-700 mb-3">학습 수준</Text>
          <View className="flex-row gap-2 mb-8">
            {LEVELS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                className="px-4 py-2 rounded-full"
                style={[styles.chip, level === l && styles.chipSelected]}
              >
                <Text style={level === l ? styles.chipTextSelected : styles.chipText}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleDone}
            disabled={loading}
            className="h-14 items-center justify-center rounded-2xl disabled:opacity-60"
            style={styles.button}
          >
            <LinearGradient
              colors={["#B88FCE", "#F093A0", "#FFB88C"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              className="rounded-2xl"
            />
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">시작하기</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chip: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
  },
  chipSelected: { borderColor: "#8b5cf6", backgroundColor: "#8b5cf6" },
  chipText: { color: "#374151", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#fff", fontSize: 13, fontWeight: "600" },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
