import * as React from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestFriend, checkFriendStatus } from "../api/friends";
import { createChatRoom } from "../api/chat";
import { reportUser } from "../api/report";
import { callAgain } from "../api/call";
import { getMatchResult, type MatchResultData } from "../api/match";
import { getSocket } from "../api/socket";
import CharacterBlob from "../components/CharacterBlob";

type MatchResultScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MatchResult"
>;

type MatchResultScreenRouteProp = {
  key: string;
  name: "MatchResult";
  params: {
    sessionId: number;
    partnerId?: string;
    totalTime: string;
  };
};

const REPORT_REASONS = ["욕설·비하", "성희롱", "스팸·광고", "기타"];

export default function MatchResultScreen() {
  const navigation = useNavigation<MatchResultScreenNavigationProp>();
  const route = useRoute<MatchResultScreenRouteProp>();
  const { sessionId, partnerId, totalTime } = route.params;
  const { width } = useWindowDimensions();
  const charSize = Math.min(width * 0.4, 180);
  const circleSize = Math.min(width * 0.6, 240);

  const [partnerProfile, setPartnerProfile] = React.useState<MatchResultData | null>(null);
  const [friendRequestStatus, setFriendRequestStatus] = React.useState<
    "none" | "requested" | "mutual"
  >("none");
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [isCallingAgain, setIsCallingAgain] = React.useState(false);
  const [isWaitingRematch, setIsWaitingRematch] = React.useState(false);
  const [isReporting, setIsReporting] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [profileLoadFailed, setProfileLoadFailed] = React.useState(false);

  const enterAnim = React.useRef(new Animated.Value(0)).current;
  const celebAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 55,
      friction: 9,
    }).start();
  }, [enterAnim]);

  React.useEffect(() => {
    if (friendRequestStatus === "mutual") {
      Animated.sequence([
        Animated.timing(celebAnim, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.spring(celebAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start();
    }
  }, [friendRequestStatus, celebAnim]);

  const loadPartnerProfile = React.useCallback(() => {
    setProfileLoadFailed(false);
    getMatchResult(sessionId)
      .then(async (result) => {
        setPartnerProfile(result);
        // 이미 친구인지 확인해서 버튼 초기 상태 설정
        if (result?.profile?.userId) {
          try {
            const status = await checkFriendStatus(result.profile.userId);
            if (status.isFriend) setFriendRequestStatus("mutual");
          } catch {
            // 확인 실패해도 기본값(none) 유지
          }
        }
      })
      .catch(() => {
        setProfileLoadFailed(true);
        Alert.alert(
          "알림",
          "상대방 정보를 불러오지 못했습니다.",
          [{ text: "다시 시도", onPress: loadPartnerProfile }, { text: "닫기" }]
        );
      });
  }, [sessionId]);

  React.useEffect(() => {
    loadPartnerProfile();
  }, [loadPartnerProfile]);

  // call:rematch 소켓 수신 — 양측 모두 "다시 통화" 시 새 CallScreen으로 이동
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRematch = (data: { sessionId: number; webrtcChannelId: string; isOfferer: boolean }) => {
      if (__DEV__) console.log("[MatchResult] call:rematch received", data);
      navigation.replace("Call", {
        sessionId: data.sessionId,
        webrtcChannelId: data.webrtcChannelId,
        isOfferer: data.isOfferer,
      });
    };

    socket.on("call:rematch", handleRematch);
    return () => {
      socket.off("call:rematch", handleRematch);
    };
  }, [navigation]);

  const resolvedPartnerId = String(partnerProfile?.profile?.id ?? "");
  // SEC-M7: IDOR 방지 — 서버 반환 userId만 사용 (profile.id가 아닌 userId)
  const resolvedPartnerNumericId = partnerProfile?.profile?.userId ?? null;

  const handleFriendRequest = React.useCallback(async () => {
    if (!resolvedPartnerNumericId) {
      Alert.alert("오류", "상대방 정보를 찾을 수 없습니다.");
      return;
    }

    if (friendRequestStatus !== "none") {
      return;
    }

    setIsRequesting(true);
    try {
      const result = await requestFriend(resolvedPartnerNumericId);
      if (result.status === "ACCEPTED") {
        setFriendRequestStatus("mutual");
      } else {
        setFriendRequestStatus("requested");
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const code = e?.response?.data?.code;

      if (status === 409) {
        if (code === "DUPLICATE_FRIEND_REQUEST") {
          setFriendRequestStatus("requested");
        } else {
          setFriendRequestStatus("mutual");
        }
      } else {
        if (__DEV__) console.error("Friend request error:", e);
        Alert.alert("오류", "친구 신청 중 오류가 발생했습니다.");
      }
    } finally {
      setIsRequesting(false);
    }
  }, [resolvedPartnerNumericId, friendRequestStatus]);

  const handleCallAgain = React.useCallback(async () => {
    if (isCallingAgain || isWaitingRematch) return;

    setIsCallingAgain(true);
    try {
      await callAgain(sessionId, true);
      // 대기 상태 전환 — call:rematch 소켓 수신 시 CallScreen으로 이동
      setIsWaitingRematch(true);
    } catch (e) {
      if (__DEV__) console.error("Call again error:", e);
      Alert.alert("오류", "재연결 요청 중 오류가 발생했습니다.");
    } finally {
      setIsCallingAgain(false);
    }
  }, [sessionId, isCallingAgain, isWaitingRematch]);

  const handleReport = React.useCallback(() => {
    if (!resolvedPartnerNumericId) {
      Alert.alert("오류", "상대방 정보를 찾을 수 없습니다.");
      return;
    }

    Alert.alert(
      "신고 사유 선택",
      "신고 사유를 선택해주세요.",
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: async () => {
            setIsReporting(true);
            try {
              await reportUser(sessionId, resolvedPartnerNumericId, reason);
              Alert.alert("신고 완료", "신고가 접수되었습니다. 검토 후 조치하겠습니다.");
              navigation.replace("MainTabs");
            } catch (e) {
              if (__DEV__) console.error("Report error:", e);
              Alert.alert("오류", "신고 중 오류가 발생했습니다.");
            } finally {
              setIsReporting(false);
            }
          },
        })),
        {
          text: "취소",
          style: "cancel",
        },
      ]
    );
  }, [sessionId, resolvedPartnerNumericId, navigation]);

  const handleGoHome = React.useCallback(() => {
    navigation.replace("MainTabs");
  }, [navigation]);

  const partnerNickname = partnerProfile?.profile?.nickname;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4C1D95", "#5B21B6", "#1E3A8A"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 중앙: 통화 시간 서클 UI 및 캐릭터 */}
          <Animated.View
            className="items-center mb-8"
            style={{
              opacity: enterAnim,
              transform: [
                { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            }}
          >
            {/* 통화 시간 서클 */}
            <View
              style={[
                styles.timeCircle,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
                style={StyleSheet.absoluteFill}
                className="rounded-full"
              />
              <View className="items-center justify-center flex-1">
                <Text className="text-3xl mb-1">✨</Text>
                <Text className="text-5xl font-bold text-white mb-1">
                  {totalTime}
                </Text>
                <Text className="text-sm text-white/60 tracking-widest uppercase">통화 완료</Text>
              </View>
            </View>

            {/* 문구 */}
            <View className="mt-6">
              {partnerNickname ? (
                <>
                  <Text className="text-2xl font-bold text-white text-center px-4">
                    {partnerNickname}님과의 대화
                  </Text>
                  <Text className="text-base text-white/60 text-center mt-1">
                    즐거우셨나요? 🎙️
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-2xl font-bold text-white text-center px-4">
                    {totalTime} 동안의 대화
                  </Text>
                  <Text className="text-base text-white/60 text-center mt-1">
                    즐거우셨나요? 🎙️
                  </Text>
                </>
              )}
            </View>

            {/* 상대방 캐릭터 */}
            <View className="mt-8">
              <CharacterBlob
                size={charSize}
                colors={["#60A5FA", "#3B82F6", "#8B5CF6"]}
              />
            </View>
          </Animated.View>

          {/* 친구 신청 섹션 */}
          <View className="mb-6 px-6">
            <Text className="text-lg font-semibold text-white text-center mb-4">
              상대방과 계속 연락하고 싶나요?
            </Text>

            {friendRequestStatus === "mutual" ? (
              <Animated.View className="items-center" style={{ transform: [{ scale: celebAnim }] }}>
                <View className="mb-4 w-full px-4 py-4 rounded-2xl bg-green-500/20 border-2 border-green-400 items-center">
                  <Text className="text-xl mb-1">🎉</Text>
                  <Text className="text-base font-bold text-green-200 text-center">
                    친구가 되었어요!
                  </Text>
                  <Text className="text-xs text-green-300/70 mt-1 text-center">
                    친구 목록에서 언제든 통화할 수 있어요
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowProfileModal(true)}
                  className="h-13 w-full items-center justify-center rounded-2xl bg-purple-500"
                >
                  <Text className="text-base font-semibold text-white">
                    프로필 보기
                  </Text>
                </Pressable>
              </Animated.View>
            ) : friendRequestStatus === "requested" ? (
              <View className="w-full px-4 py-4 rounded-2xl bg-white/10 border border-white/20 items-center">
                <Text className="text-base font-semibold text-white/80 text-center">
                  친구 신청 완료 ✓
                </Text>
                <Text className="text-xs text-white/50 mt-1 text-center">
                  상대방이 수락하면 친구로 연결됩니다
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleFriendRequest}
                disabled={isRequesting || profileLoadFailed || !resolvedPartnerNumericId}
                className={`h-14 w-full items-center justify-center rounded-2xl ${
                  profileLoadFailed ? "bg-gray-500/50" : "bg-purple-500"
                } disabled:opacity-60`}
              >
                <Text className="text-lg font-semibold text-white">
                  {profileLoadFailed
                    ? "정보 없음"
                    : isRequesting
                    ? "신청 중..."
                    : "친구 신청하기"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* 재연결 버튼 */}
          <View className="mb-6 px-6">
            {isWaitingRematch ? (
              <View className="rounded-2xl bg-blue-500/40 border border-blue-400/50 px-4 py-3">
                <Text className="text-base font-semibold text-white/80 text-center">
                  상대방 수락 대기 중...
                </Text>
                <Text className="text-xs text-white/50 mt-0.5 text-center">
                  상대방도 수락하면 통화가 시작됩니다
                </Text>
                <Pressable
                  onPress={() => setIsWaitingRematch(false)}
                  className="mt-3 h-8 items-center justify-center rounded-xl bg-white/10 border border-white/20"
                >
                  <Text className="text-xs text-white/60">취소</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleCallAgain}
                disabled={isCallingAgain}
                className="h-14 w-full items-center justify-center rounded-2xl bg-blue-500 disabled:opacity-60"
              >
                <Text className="text-lg font-semibold text-white">
                  {isCallingAgain ? "요청 중..." : "이 사람과 다시 통화하기"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* 홈으로 가기 버튼 */}
          <View className="mb-8 px-6">
            <Pressable
              onPress={handleGoHome}
              className="h-12 w-full items-center justify-center rounded-2xl bg-white/10 border border-white/20"
            >
              <Text className="text-base font-semibold text-white">
                홈으로 가기
              </Text>
            </Pressable>
          </View>

          {/* 신고 버튼 - 하단에 작고 차분한 톤 */}
          <View className="px-6 pb-8 mt-4">
            <Pressable
              onPress={handleReport}
              disabled={isReporting}
              className="h-8 items-center justify-center"
            >
              <Text className="text-xs text-white/50">
                {isReporting ? "신고 중..." : "신고하기"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 상대방 프로필 Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <LinearGradient
              colors={["#3B0764", "#1E3A8A"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* 닫기 핸들 */}
            <View style={styles.modalHandle} />

            {/* 프로필 이미지 */}
            <View className="items-center mt-4 mb-4">
              {partnerProfile?.profile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profile.profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <CharacterBlob size={80} colors={["#60A5FA", "#3B82F6", "#8B5CF6"]} />
              )}
            </View>

            {/* 닉네임 */}
            <Text className="text-xl font-bold text-white text-center mb-2">
              {partnerProfile?.profile?.nickname ?? "알 수 없음"}
            </Text>

            {/* bio */}
            <Text className="text-sm text-white/70 text-center px-6 mb-6">
              {partnerProfile?.profile?.bio ?? "소개가 없습니다"}
            </Text>

            {/* 채팅하기 버튼 (친구가 된 경우) */}
            {friendRequestStatus === "mutual" && resolvedPartnerNumericId && (
              <Pressable
                onPress={async () => {
                  try {
                    const room = await createChatRoom(resolvedPartnerNumericId);
                    setShowProfileModal(false);
                    navigation.replace("Chat", {
                      roomId: room.roomId,
                      friendNickname: partnerProfile?.profile?.nickname ?? "상대방",
                      friendProfileImageUrl: partnerProfile?.profile?.profileImageUrl ?? undefined,
                    });
                  } catch {
                    Alert.alert("오류", "채팅방을 열 수 없습니다.");
                  }
                }}
                className="mx-6 h-12 items-center justify-center rounded-2xl bg-purple-500 mb-3"
              >
                <Text className="text-base font-semibold text-white">💬  채팅하기</Text>
              </Pressable>
            )}

            {/* 닫기 버튼 */}
            <Pressable
              onPress={() => setShowProfileModal(false)}
              className="mx-6 h-11 items-center justify-center rounded-2xl bg-white/20 border border-white/30"
            >
              <Text className="text-base font-semibold text-white">닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 40,
    paddingBottom: 20,
  },
  timeCircle: {
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    overflow: "hidden",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
});
