import * as React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ListRenderItem,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getFriendList,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  requestCallToFriend,
  deleteFriend,
  blockFriend,
  type Friend,
  type PendingFriendRequest,
} from "../api/friends";
import { createChatRoom } from "../api/chat";
import { getSocket } from "../api/socket";
import type { Socket } from "socket.io-client";

type FriendListScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "FriendList">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function FriendListScreen() {
  const navigation = useNavigation<FriendListScreenNavigationProp>();
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<PendingFriendRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingRequestId, setProcessingRequestId] = React.useState<number | null>(null);
  const [selectedFriend, setSelectedFriend] = React.useState<Friend | null>(null);
  const [onlineStatusMap, setOnlineStatusMap] = React.useState<Record<number, boolean>>({});
  const socketRef = React.useRef<Socket | null>(null);

  // 친구 목록 + 친구 요청 로드
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [friendList, requestList] = await Promise.all([
        getFriendList(),
        getFriendRequests(),
      ]);
      setFriends(friendList);
      setPendingRequests(requestList.filter((r) => r.status === "PENDING"));
    } catch (e) {
      console.error("Failed to load friends:", e);
      Alert.alert("오류", "친구 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Socket.io — friend:status-change (백엔드 구현 시 동작)
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    const handleStatusChange = (data: { friendId: number; isOnline: boolean }) => {
      if (__DEV__) console.log("[FriendList] friend:status-change", data);
      setOnlineStatusMap((prev) => ({ ...prev, [data.friendId]: data.isOnline }));
    };

    socket.on("friend:status-change", handleStatusChange);

    return () => {
      socket.off("friend:status-change", handleStatusChange);
    };
  }, []);

  // 친구 요청 수락
  const handleAccept = React.useCallback(async (requestId: number) => {
    setProcessingRequestId(requestId);
    try {
      await acceptFriendRequest(requestId);
      await loadData(); // 목록 새로고침
    } catch (e) {
      console.error("Accept error:", e);
      Alert.alert("오류", "친구 요청 수락에 실패했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  }, [loadData]);

  // 친구 요청 거절
  const handleReject = React.useCallback(async (requestId: number) => {
    setProcessingRequestId(requestId);
    try {
      await rejectFriendRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error("Reject error:", e);
      Alert.alert("오류", "친구 요청 거절에 실패했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  // 친구 삭제
  const handleDeleteFriend = React.useCallback((friend: Friend) => {
    Alert.alert(
      `${friend.nickname}님을 삭제할까요?`,
      "친구 목록에서 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFriend(friend.friendshipId);
              setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
            } catch (e) {
              if (__DEV__) console.error("Delete friend error:", e);
              Alert.alert("오류", "친구 삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  }, []);

  // 친구 차단
  const handleBlockFriend = React.useCallback((friend: Friend) => {
    Alert.alert(
      `${friend.nickname}님을 차단할까요?`,
      "차단하면 친구 관계가 해제되고, 이후 매칭에서 만나지 않습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: async () => {
            try {
              await blockFriend(friend.friendshipId);
              setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
            } catch (e) {
              if (__DEV__) console.error("Block friend error:", e);
              Alert.alert("오류", "차단에 실패했습니다.");
            }
          },
        },
      ]
    );
  }, []);

  // 채팅 시작
  const handleOpenChat = React.useCallback(async (friend: Friend) => {
    try {
      const room = await createChatRoom(friend.userId);
      setSelectedFriend(null);
      navigation.navigate("Chat", {
        roomId: room.roomId,
        friendNickname: friend.nickname ?? "알 수 없음",
        friendProfileImageUrl: friend.profileImageUrl ?? undefined,
      });
    } catch (e) {
      if (__DEV__) console.error("Open chat error:", e);
      Alert.alert("오류", "채팅방을 열 수 없습니다.");
    }
  }, [navigation]);

  // 통화 요청
  const handleCallRequest = React.useCallback(async (friend: Friend) => {
    try {
      const result = await requestCallToFriend(friend.userId);
      navigation.navigate("Call", {
        sessionId: result.sessionId,
        webrtcChannelId: result.webrtcChannelId,
        isOfferer: true,
      });
    } catch (e) {
      console.error("Call request error:", e);
      Alert.alert("오류", "통화 요청에 실패했습니다.");
    }
  }, [navigation]);

  // 날짜 포맷팅
  const formatFriendSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return "오늘 친구가 됨";
    if (diffDays < 7) return `${diffDays}일 전 친구가 됨`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전 친구가 됨`;
    return date.toLocaleDateString("ko-KR") + " 친구가 됨";
  };

  // 친구 프로필 클릭
  const handleFriendProfilePress = React.useCallback((friend: Friend) => {
    setSelectedFriend(friend);
  }, []);

  // 친구 항목 렌더링
  const renderFriendItem: ListRenderItem<Friend> = ({ item: friend }) => {
    const isOnline = onlineStatusMap[friend.userId] ?? false;
    return (
    <Pressable
      className="mb-4 mx-4 p-4 rounded-2xl bg-white/10 border border-white/20 active:opacity-80"
      onPress={() => handleFriendProfilePress(friend)}
      onLongPress={() => {
        Alert.alert(friend.nickname ?? "친구", "", [
          {
            text: "💬 채팅하기",
            onPress: () => handleOpenChat(friend),
          },
          {
            text: "🗑 친구 삭제",
            style: "destructive",
            onPress: () => handleDeleteFriend(friend),
          },
          {
            text: "🚫 차단하기",
            style: "destructive",
            onPress: () => handleBlockFriend(friend),
          },
          { text: "취소", style: "cancel" },
        ]);
      }}
    >
      <View className="flex-row items-center">
        <View className="relative">
          {friend.profileImageUrl ? (
            <Image
              source={{ uri: friend.profileImageUrl }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileImageInitial}>
                {(friend.nickname ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View className="flex-1 ml-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-white">
              {friend.nickname ?? "알 수 없음"}
            </Text>
            {isOnline && (
              <Text className="text-xs text-green-400">온라인</Text>
            )}
          </View>
          {friend.bio ? (
            <Text className="text-sm text-white/60 mb-1" numberOfLines={1}>
              {friend.bio}
            </Text>
          ) : null}
          <Text className="text-xs text-white/40">
            {formatFriendSince(friend.friendSince)}
          </Text>
        </View>

        <Pressable
          onPress={() => handleCallRequest(friend)}
          className="ml-3 h-10 px-4 items-center justify-center rounded-xl bg-purple-500 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-white">📞 통화</Text>
        </Pressable>
      </View>
    </Pressable>
  );
  };

  // 친구 요청 항목 렌더링
  const renderRequestItem = (request: PendingFriendRequest) => {
    const isProcessing = processingRequestId === request.id;
    return (
      <View
        key={request.id}
        className="mb-3 mx-4 p-4 rounded-2xl bg-purple-500/20 border border-purple-400/40"
      >
        <View className="flex-row items-center">
          {request.senderProfileImageUrl ? (
            <Image
              source={{ uri: request.senderProfileImageUrl }}
              style={styles.requestImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.requestImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileImageInitial}>
                {(request.senderNickname ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-white">
              {request.senderNickname ?? "알 수 없음"}
            </Text>
            <Text className="text-xs text-purple-300">친구 요청을 보냈어요</Text>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleAccept(request.id)}
              disabled={isProcessing}
              className="h-9 px-3 items-center justify-center rounded-xl bg-purple-500 disabled:opacity-60"
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">수락</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => handleReject(request.id)}
              disabled={isProcessing}
              className="h-9 px-3 items-center justify-center rounded-xl bg-white/10 border border-white/20 disabled:opacity-60"
            >
              <Text className="text-sm font-semibold text-white/70">거절</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Empty State
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 py-20">
      <Text className="text-4xl mb-6">💫</Text>
      <Text className="text-2xl font-bold text-white/90 text-center mb-3">
        아직 연결된 인연이 없어요
      </Text>
      <Text className="text-base text-white/60 text-center mb-8 px-4">
        새로운 대화를 시작해보세요!
      </Text>
      <Pressable
        onPress={() => navigation.navigate("Home")}
        className="h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-purple-500"
      >
        <Text className="text-lg font-semibold text-white">매칭 시작</Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#10101E", "#16213E"]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <View className="px-4 pt-6 pb-4">
            <Text className="text-3xl font-bold text-white">친구 목록</Text>
          </View>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="rgba(255,255,255,0.6)" />
            <Text className="text-white/60 mt-3">불러오는 중...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#10101E", "#16213E"]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* FriendDetail 모달 */}
      <Modal
        visible={selectedFriend !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFriend(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedFriend(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* 프로필 이미지 */}
            <View style={styles.modalAvatarWrapper}>
              {selectedFriend?.profileImageUrl ? (
                <Image
                  source={{ uri: selectedFriend.profileImageUrl }}
                  style={styles.modalAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.modalAvatar, styles.profileImagePlaceholder]}>
                  <Text style={styles.modalAvatarInitial}>
                    {(selectedFriend?.nickname ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* 닉네임 */}
            <Text style={styles.modalNickname}>
              {selectedFriend?.nickname ?? "알 수 없음"}
            </Text>

            {/* 소개 */}
            {selectedFriend?.bio ? (
              <Text style={styles.modalBio}>{selectedFriend.bio}</Text>
            ) : null}

            {/* 친구가 된 날 */}
            <Text style={styles.modalSince}>
              {selectedFriend ? formatFriendSince(selectedFriend.friendSince) : ""}
            </Text>

            {/* 통화 요청 버튼 */}
            <Pressable
              style={styles.modalCallButton}
              onPress={() => {
                if (selectedFriend) {
                  setSelectedFriend(null);
                  handleCallRequest(selectedFriend);
                }
              }}
            >
              <Text style={styles.modalCallButtonText}>📞  통화 요청</Text>
            </Pressable>

            {/* 채팅 버튼 */}
            <Pressable
              style={styles.modalChatButton}
              onPress={() => selectedFriend && handleOpenChat(selectedFriend)}
            >
              <Text style={styles.modalChatButtonText}>💬  채팅하기</Text>
            </Pressable>

            {/* 친구 삭제 */}
            <Pressable
              style={styles.modalDeleteButton}
              onPress={() => {
                if (selectedFriend) {
                  setSelectedFriend(null);
                  handleDeleteFriend(selectedFriend);
                }
              }}
            >
              <Text style={styles.modalDeleteButtonText}>친구 삭제</Text>
            </Pressable>

            {/* 차단 */}
            <Pressable
              style={styles.modalBlockButton}
              onPress={() => {
                if (selectedFriend) {
                  setSelectedFriend(null);
                  handleBlockFriend(selectedFriend);
                }
              }}
            >
              <Text style={styles.modalBlockButtonText}>🚫  차단하기</Text>
            </Pressable>

            {/* 닫기 */}
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setSelectedFriend(null)}
            >
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        {/* 헤더 */}
        <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-white">친구 목록</Text>
          {friends.length > 0 && (
            <Text className="text-sm text-white/50">{friends.length}명</Text>
          )}
        </View>

        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={
            friends.length === 0 && pendingRequests.length === 0
              ? styles.emptyContainer
              : styles.listContainer
          }
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <View className="mb-2">
                <Text className="text-sm font-semibold text-purple-300 px-4 mb-3">
                  친구 요청 {pendingRequests.length}건
                </Text>
                {pendingRequests.map(renderRequestItem)}
                <View className="h-px bg-white/10 mx-4 mb-4" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            pendingRequests.length === 0 ? renderEmptyState : null
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  profileImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "rgba(16, 16, 30, 0.8)",
  },
  profileImageInitial: {
    fontSize: 22,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.7)",
  },
  requestImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: 300,
    backgroundColor: "#1E1E3A",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalAvatarWrapper: {
    marginBottom: 16,
  },
  modalAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalAvatarInitial: {
    fontSize: 34,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.7)",
  },
  modalNickname: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
  },
  modalBio: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSince: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 24,
  },
  modalCallButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#8B5CF6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalCallButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalChatButton: {
    width: "100%",
    height: 48,
    backgroundColor: "rgba(99,102,241,0.25)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.4)",
  },
  modalChatButtonText: {
    color: "rgba(199,210,254,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
  modalDeleteButton: {
    width: "100%",
    height: 44,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  modalDeleteButtonText: {
    color: "rgba(252,165,165,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  modalBlockButton: {
    width: "100%",
    height: 44,
    backgroundColor: "rgba(107,114,128,0.15)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(107,114,128,0.3)",
  },
  modalBlockButtonText: {
    color: "rgba(209,213,219,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  modalCloseButton: {
    width: "100%",
    height: 44,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalCloseButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
});
