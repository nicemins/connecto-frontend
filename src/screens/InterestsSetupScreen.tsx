import * as React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { saveInterests, getInterests } from "../api/languages";

type Nav = NativeStackNavigationProp<RootStackParamList, "InterestsSetup">;

const INTERESTS = [
  "여행", "음악", "영화", "독서", "요리",
  "스포츠", "게임", "사진", "패션", "기술",
  "예술", "음식", "자연", "반려동물", "언어학습",
];

export default function InterestsSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);

  React.useEffect(() => {
    getInterests()
      .then((interests) => setSelected(new Set(interests)))
      .catch(() => {}) // 조회 실패 시 빈 상태로 진행
      .finally(() => setInitializing(false));
  }, []);

  const toggle = (interest: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) {
        next.delete(interest);
      } else {
        next.add(interest);
      }
      return next;
    });
  };

  const handleDone = async () => {
    if (selected.size === 0) {
      navigation.replace("MainTabs");
      return;
    }
    setLoading(true);
    try {
      await saveInterests(Array.from(selected));
      navigation.replace("MainTabs");
    } catch {
      Alert.alert("오류", "관심사 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8D5F2", "#D4E8F7", "#FFF0E8", "#FFF5E6"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-bold text-gray-800 mt-8 mb-2">관심사 선택</Text>
          <Text className="text-sm text-gray-500 mb-8">
            관심사를 선택하면 더 잘 맞는 상대를 만날 수 있어요 (선택 사항)
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-10">
            {INTERESTS.map((interest) => (
              <Pressable
                key={interest}
                onPress={() => toggle(interest)}
                className="px-4 py-2 rounded-full"
                style={[
                  styles.chip,
                  selected.has(interest) && styles.chipSelected,
                ]}
              >
                <Text
                  style={
                    selected.has(interest) ? styles.chipTextSelected : styles.chipText
                  }
                >
                  {interest}
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
              <Text className="text-base font-semibold text-white">
                {selected.size === 0 ? "건너뛰기" : "완료"}
              </Text>
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
  chipSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#8b5cf6",
  },
  chipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
});
