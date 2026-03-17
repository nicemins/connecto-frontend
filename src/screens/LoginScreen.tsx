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
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { login, loginWithSocial, getMe } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import CharacterBlob from "../components/CharacterBlob";

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (status === 429) return "잠시 후 다시 시도해주세요.";
    if (status && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  return "로그인에 실패했습니다.";
}

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { persistTokens, setMe } = useAuthStore();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.4, 160);

  const [activeTab, setActiveTab] = React.useState<"social" | "email">("social");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState<string | null>(null);

  // SEC-H3: 로그인 실패 rate limiting
  const [failCount, setFailCount] = React.useState(0);
  const [cooldownUntil, setCooldownUntil] = React.useState(0);
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const cooldownTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function getBackoffMs(count: number): number {
    if (count >= 5) return 30_000;
    return Math.min(1000 * Math.pow(2, count - 1), 16_000);
  }

  function startCooldownTimer(until: number) {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        clearInterval(cooldownTimerRef.current!);
        cooldownTimerRef.current = null;
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
  }

  React.useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // M-3: 모듈 레벨 실행 대신 useEffect 내에서 초기화
  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
  }, []);

  const handleGoogle = async () => {
    if (loading) return;
    setLoading("google");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        Alert.alert("로그인 실패", "Google에서 토큰을 받지 못했습니다.");
        return;
      }
      const { accessToken, refreshToken } = await loginWithSocial("google", idToken);
      await persistTokens(accessToken, refreshToken ?? null);
      const me = await getMe();
      setMe(me);
      if (!me.profile) {
        navigation.replace("ProfileSetup");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        // 사용자가 취소
      } else {
        Alert.alert("로그인 실패", getErrorMessage(e));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleKakao = () => {
    Alert.alert("준비 중", "카카오 로그인은 곧 지원될 예정입니다.");
  };

  const handleLine = () => {
    Alert.alert("준비 중", "라인 로그인은 곧 지원될 예정입니다.");
  };

  const handleEmailLogin = async () => {
    // SEC-H3: 쿨다운 중이면 차단
    if (Date.now() < cooldownUntil) return;

    if (!email.trim() || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    setLoading("email");
    try {
      const { accessToken, refreshToken } = await login(email.trim(), password);
      await persistTokens(accessToken, refreshToken ?? null);
      const me = await getMe();
      setMe(me);
      setFailCount(0); // 성공 시 실패 카운트 초기화
      if (!me.profile) {
        navigation.replace("ProfileSetup");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (e: unknown) {
      // SEC-H3: 실패 시 backoff 계산
      const newCount = failCount + 1;
      setFailCount(newCount);
      const backoff = getBackoffMs(newCount);
      const until = Date.now() + backoff;
      setCooldownUntil(until);
      setCooldownRemaining(Math.ceil(backoff / 1000));
      startCooldownTimer(until);
      Alert.alert("로그인 실패", getErrorMessage(e));
    } finally {
      setLoading(null);
      setPassword(""); // SEC-L2: 비밀번호 state 초기화
    }
  };

  const busy = !!loading;

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
              <Text className="mt-1 text-sm text-gray-500">5분 익명 보이스 채팅</Text>
            </View>

            {/* 캐릭터 */}
            <View className="items-center justify-center py-6">
              <CharacterBlob
                size={charSize}
                colors={["#FFB88C", "#F093A0", "#B88FCE"]}
              />
            </View>

            {/* 탭 선택 */}
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tab, activeTab === "social" && styles.tabActive]}
                onPress={() => setActiveTab("social")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "social" && styles.tabTextActive,
                  ]}
                >
                  소셜 로그인
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === "email" && styles.tabActive]}
                onPress={() => setActiveTab("email")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "email" && styles.tabTextActive,
                  ]}
                >
                  이메일 로그인
                </Text>
              </Pressable>
            </View>

            {/* 소셜 탭 */}
            {activeTab === "social" && (
              <View className="gap-3 pt-4 pb-4">
                <Pressable
                  onPress={handleKakao}
                  disabled={busy}
                  style={[styles.socialButton, styles.kakaoButton]}
                >
                  {loading === "kakao" ? (
                    <ActivityIndicator color="#191919" />
                  ) : (
                    <Text style={[styles.socialButtonText, { color: "#191919" }]}>
                      카카오로 시작하기
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleGoogle}
                  disabled={busy}
                  style={[styles.socialButton, styles.googleButton]}
                >
                  {loading === "google" ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <Text style={[styles.socialButtonText, { color: "#374151" }]}>
                      구글로 시작하기
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleLine}
                  disabled={busy}
                  style={[styles.socialButton, styles.lineButton]}
                >
                  {loading === "line" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.socialButtonText, { color: "#fff" }]}>
                      라인으로 시작하기
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* 이메일 탭 */}
            {activeTab === "email" && (
              <View className="gap-3 pt-4 pb-4">
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  maxLength={254}
                />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!busy}
                  onSubmitEditing={handleEmailLogin}
                  returnKeyType="go"
                  maxLength={128}
                />

                <Pressable
                  onPress={handleEmailLogin}
                  disabled={busy || cooldownRemaining > 0}
                  style={styles.loginButton}
                >
                  <LinearGradient
                    colors={["#B88FCE", "#F093A0", "#FFB88C"]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14, opacity: cooldownRemaining > 0 ? 0.5 : 1 }]}
                  />
                  {loading === "email" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      {cooldownRemaining > 0 ? `${cooldownRemaining}초 후 재시도` : "로그인"}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate("SignUp")}
                  disabled={busy}
                  className="h-12 items-center justify-center"
                >
                  <Text className="text-sm text-gray-500">
                    계정이 없으신가요?{" "}
                    <Text className="font-semibold text-purple-500">회원가입</Text>
                  </Text>
                </Pressable>
              </View>
            )}

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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#374151",
    fontWeight: "700",
  },
  socialButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  kakaoButton: {
    backgroundColor: "#FEE500",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  lineButton: {
    backgroundColor: "#06C755",
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
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
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
