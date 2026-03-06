import * as React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { login, getMe } from "../api/auth";
import { useAuthStore } from "../store/authStore";

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const r = (e as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return "로그인에 실패했습니다.";
}

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { persistTokens, setMe } = useAuthStore();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.45, 180);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { accessToken, refreshToken } = await login(email.trim(), password);
      await persistTokens(accessToken, refreshToken ?? undefined);

      // 내 정보 조회
      const me = await getMe();
      setMe(me);

      if (!me.profile) {
        navigation.replace("ProfileSetup");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (e: unknown) {
      Alert.alert("로그인 실패", getErrorMessage(e));
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 로고 */}
            <View className="items-center pt-10 pb-2">
              <Text className="text-3xl font-bold text-gray-800">Connecto</Text>
              <Text className="mt-1 text-sm text-gray-500">
                5분 익명 보이스 채팅
              </Text>
            </View>

            {/* 캐릭터 */}
            <View className="items-center justify-center py-6">
              <View
                style={[
                  styles.characterBlob,
                  {
                    width: charSize,
                    height: charSize,
                    borderRadius: charSize / 2,
                  },
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

            {/* 폼 */}
            <View className="gap-3 pb-4">
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                className="h-14 items-center justify-center rounded-2xl disabled:opacity-60"
                style={styles.loginButton}
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
                    로그인
                  </Text>
                )}
              </Pressable>

              {/* 회원가입 링크 */}
              <Pressable
                onPress={() => navigation.navigate("SignUp")}
                disabled={loading}
                className="h-12 items-center justify-center"
              >
                <Text className="text-sm text-gray-500">
                  계정이 없으신가요?{" "}
                  <Text className="font-semibold text-purple-500">
                    회원가입
                  </Text>
                </Text>
              </Pressable>
            </View>

            <Text className="pb-8 text-center text-xs text-gray-400">
              로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  eyes: { flexDirection: "row", gap: 12 },
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
  input: {
    height: 52,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  loginButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
