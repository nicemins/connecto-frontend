import * as React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { createProfile, checkNicknameAvailable } from "../api/profile";
import { getMe } from "../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "ProfileSetup">;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const { setMe } = useAuthStore();
  const [nickname, setNickname] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleNext = async () => {
    if (!nickname.trim()) {
      Alert.alert("입력 오류", "닉네임을 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const available = await checkNicknameAvailable(nickname.trim());
      if (!available) {
        Alert.alert("중복 닉네임", "이미 사용 중인 닉네임입니다.");
        return;
      }
      await createProfile({ nickname: nickname.trim(), bio: bio.trim() || undefined });
      const me = await getMe();
      setMe(me);
      navigation.replace("LanguageSetup");
    } catch {
      Alert.alert("오류", "프로필 저장에 실패했습니다.");
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
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }} edges={["top", "bottom"]}>
        <Text className="text-2xl font-bold text-gray-800 mb-2">프로필 설정</Text>
        <Text className="text-sm text-gray-500 mb-8">닉네임을 설정해주세요</Text>

        <View className="gap-3">
          <TextInput
            style={styles.input}
            placeholder="닉네임"
            placeholderTextColor="#9ca3af"
            value={nickname}
            onChangeText={setNickname}
            editable={!loading}
          />
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder="자기소개 (선택)"
            placeholderTextColor="#9ca3af"
            value={bio}
            onChangeText={setBio}
            multiline
            editable={!loading}
          />

          <Pressable
            onPress={handleNext}
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
              <Text className="text-base font-semibold text-white">다음</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  input: {
    height: 52,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2937",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
