import * as React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { login } from "../api/auth";
import { useAuthStore } from "../store/authStore";

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  if (e && typeof e === "object" && "response" in e) {
    const r = (e as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return "로그인에 실패했습니다.";
}

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "PLACEHOLDER_WEB_CLIENT_ID.apps.googleusercontent.com";

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [loading, setLoading] = React.useState<string | null>(null);
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.5, 200);
  const eyeTop = charSize * 0.38;
  const mouthTop = charSize * 0.52;

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      androidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? undefined,
      scopes: ["openid", "profile", "email"],
    });

  React.useEffect(() => {
    if (!googleResponse || loading !== "google") return;
    if (googleResponse.type === "dismiss" || googleResponse.type === "error") {
      setLoading(null);
      return;
    }
    if (googleResponse.type !== "success") return;
    const { authentication } = googleResponse;
    const token = authentication?.idToken ?? authentication?.accessToken;
    if (!token) {
      setLoading(null);
      Alert.alert("로그인 실패", "Google에서 토큰을 받지 못했습니다.");
      return;
    }
    (async () => {
      try {
        const { accessToken } = await login("google", token);
        setAccessToken(accessToken);
        setLoading(null);
        navigation.replace("Home");
      } catch (e: unknown) {
        setLoading(null);
        Alert.alert("로그인 실패", getErrorMessage(e));
      }
    })();
  }, [googleResponse, loading, setAccessToken, navigation]);

  const runLogin = async (
    provider: "kakao" | "google" | "line",
    token: string
  ) => {
    if (loading) return;
    setLoading(provider);
    try {
      const { accessToken } = await login(provider, token);
      setAccessToken(accessToken);
      setLoading(null);
      navigation.replace("Home");
    } catch (e: unknown) {
      setLoading(null);
      Alert.alert("로그인 실패", getErrorMessage(e));
    }
  };

  const handleKakao = () => {
    runLogin("kakao", "dev-kakao-token");
  };

  const handleGoogle = async () => {
    if (loading) return;
    if (!googleRequest) {
      Alert.alert("준비 중", "Google 로그인 설정을 불러오는 중입니다.");
      return;
    }
    setLoading("google");
    try {
      await googlePromptAsync();
    } catch {
      setLoading(null);
      Alert.alert("로그인 실패", "Google 로그인을 시작하지 못했습니다.");
    }
  };

  const handleLine = () => {
    runLogin("line", "dev-line-token");
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단: 로고 + 태그라인 */}
          <View className="items-center pt-6 pb-4">
            <Text className="text-2xl font-bold text-gray-800">Connecto</Text>
            <Text className="mt-1 text-base text-gray-600">
              5분 익명 보이스 채팅
            </Text>
          </View>

          {/* 중앙: 귀여운 메인 캐릭터 */}
          <View className="flex-1 items-center justify-center py-8">
            <View
              style={[
                styles.characterBlob,
                { width: charSize, height: charSize, borderRadius: charSize / 2 },
              ]}
            >
              <LinearGradient
                colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                locations={[0, 0.5, 1]}
                style={[styles.characterGradient, { borderRadius: charSize / 2 }]}
              />
              <View style={[styles.faceRow, { top: eyeTop }]}>
                <View style={styles.eyes}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>
              </View>
              <View style={[styles.faceRow, { top: mouthTop }]}>
                <View style={styles.mouth} />
              </View>
            </View>
          </View>

          {/* 하단: 소셜 로그인 버튼 */}
          <View className="gap-3 pb-6">
            <Pressable
              onPress={handleKakao}
              disabled={busy}
              className="active:opacity-80 h-14 items-center justify-center rounded-2xl bg-[#FEE500] disabled:opacity-60"
            >
              {loading === "kakao" ? (
                <ActivityIndicator color="#191919" />
              ) : (
                <Text className="text-base font-semibold text-[#191919]">
                  카카오로 시작하기
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleGoogle}
              disabled={busy}
              className="active:opacity-80 h-14 items-center justify-center rounded-2xl border-2 border-gray-300 bg-white disabled:opacity-60"
            >
              {loading === "google" ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <Text className="text-base font-semibold text-gray-700">
                  구글로 시작하기
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleLine}
              disabled={busy}
              className="active:opacity-80 h-14 items-center justify-center rounded-2xl bg-[#06C755] disabled:opacity-60"
            >
              {loading === "line" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  라인으로 시작하기
                </Text>
              )}
            </Pressable>
          </View>

          {/* 푸터 */}
          <Text className="pb-8 text-center text-xs text-gray-500">
            로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다
          </Text>
        </ScrollView>
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
