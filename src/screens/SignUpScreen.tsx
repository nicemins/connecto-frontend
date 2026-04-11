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
import { signup, checkEmailAvailable } from "../api/auth";

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SignUp"
>;

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 409) return "이미 사용 중인 이메일입니다.";
    if (status === 429) return "잠시 후 다시 시도해주세요.";
    if (status && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  return "회원가입에 실패했습니다.";
}

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.35, 140);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [emailChecked, setEmailChecked] = React.useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // SEC-H3: 회원가입 실패 rate limiting
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

  const handleCheckEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("입력 오류", "이메일을 입력해주세요.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert("입력 오류", "올바른 이메일 형식이 아닙니다.");
      return;
    }
    setCheckingEmail(true);
    try {
      const available = await checkEmailAvailable(trimmed);
      setEmailChecked(available);
      if (!available) {
        Alert.alert("중복 확인", "이미 사용 중인 이메일입니다.");
      }
    } catch {
      Alert.alert("오류", "이메일 확인에 실패했습니다.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSignUp = async () => {
    // SEC-H3: 쿨다운 중이면 차단
    if (Date.now() < cooldownUntil) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      Alert.alert("입력 오류", "모든 항목을 입력해주세요.");
      return;
    }
    if (emailChecked === null) {
      Alert.alert("확인 필요", "이메일 중복 확인을 해주세요.");
      return;
    }
    if (!emailChecked) {
      Alert.alert("이메일 오류", "사용 가능한 이메일을 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("비밀번호 오류", "비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert("비밀번호 오류", "비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("비밀번호 오류", "비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await signup(trimmedEmail, password);
      setFailCount(0); // 성공 시 초기화
      Alert.alert("회원가입 성공", "로그인해주세요.", [
        { text: "확인", onPress: () => navigation.replace("Login") },
      ]);
    } catch (e: unknown) {
      // SEC-H3: 실패 시 backoff 계산
      const newCount = failCount + 1;
      setFailCount(newCount);
      const backoff = getBackoffMs(newCount);
      const until = Date.now() + backoff;
      setCooldownUntil(until);
      setCooldownRemaining(Math.ceil(backoff / 1000));
      startCooldownTimer(until);
      Alert.alert("회원가입 실패", getErrorMessage(e));
    } finally {
      setLoading(false);
      setPassword(""); // SEC-L2: 비밀번호 state 초기화
      setConfirmPassword("");
    }
  };

  const emailBorderColor =
    emailChecked === null
      ? "rgba(0,0,0,0.08)"
      : emailChecked
      ? "#10b981"
      : "#ef4444";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8D5F2", "#D4E8F7", "#FFF0E8", "#FFF5E6"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 헤더 */}
            <View className="flex-row items-center pt-6 pb-2">
              <Pressable onPress={() => navigation.goBack()} className="mr-3">
                <Text className="text-2xl text-gray-600">{"<"}</Text>
              </Pressable>
              <Text className="text-2xl font-bold text-gray-800">회원가입</Text>
            </View>

            {/* 캐릭터 */}
            <View className="items-center justify-center py-4">
              <View
                style={[
                  styles.characterBlob,
                  { width: charSize, height: charSize, borderRadius: charSize / 2 },
                ]}
              >
                <LinearGradient
                  colors={["#B88FCE", "#F093A0", "#FFB88C"]}
                  locations={[0, 0.5, 1]}
                  style={[styles.characterGradient, { borderRadius: charSize / 2 }]}
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
              {/* 이메일 + 중복확인 */}
              <View className="flex-row gap-2">
                <TextInput
                  style={[styles.input, { flex: 1, borderColor: emailBorderColor }]}
                  placeholder="이메일"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailChecked(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  maxLength={254}
                />
                <Pressable
                  onPress={handleCheckEmail}
                  disabled={checkingEmail || loading}
                  style={styles.checkButton}
                >
                  {checkingEmail ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.checkButtonText}>{"중복\n확인"}</Text>
                  )}
                </Pressable>
              </View>

              {emailChecked === true && (
                <Text className="text-xs text-green-600 -mt-1 ml-1">
                  사용 가능한 이메일입니다.
                </Text>
              )}

              {/* 비밀번호 */}
              <TextInput
                style={styles.input}
                placeholder="비밀번호 (영문+숫자 8자 이상)"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                maxLength={128}
              />

              {/* 비밀번호 확인 */}
              <TextInput
                style={[
                  styles.input,
                  confirmPassword.length > 0 && {
                    borderColor: password === confirmPassword ? "#10b981" : "#ef4444",
                  },
                ]}
                placeholder="비밀번호 확인"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleSignUp}
                returnKeyType="go"
                maxLength={128}
              />

              {/* 가입 버튼 */}
              <Pressable
                onPress={handleSignUp}
                disabled={loading || cooldownRemaining > 0}
                className="h-14 items-center justify-center rounded-2xl disabled:opacity-60"
                style={styles.signupButton}
              >
                <LinearGradient
                  colors={["#B88FCE", "#F093A0", "#FFB88C"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { opacity: cooldownRemaining > 0 ? 0.5 : 1 }]}
                  className="rounded-2xl"
                />
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    {cooldownRemaining > 0 ? `${cooldownRemaining}초 후 재시도` : "가입하기"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                disabled={loading}
                className="h-12 items-center justify-center"
              >
                <Text className="text-sm text-gray-500">
                  이미 계정이 있으신가요?{" "}
                  <Text className="font-semibold text-purple-500">로그인</Text>
                </Text>
              </Pressable>
            </View>
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
  eye: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1f2937" },
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
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  checkButton: {
    width: 60,
    height: 52,
    backgroundColor: "#8b5cf6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  signupButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
