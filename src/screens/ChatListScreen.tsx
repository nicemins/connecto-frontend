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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { getChatRooms, createChatRoom, leaveChatRoom, type ChatRoom } from "../api/chat";
import {
  getFriendList,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  deleteFriend,
  blockFriend,
  type Friend,
  type PendingFriendRequest,
} from "../api/friends";
import { getSocket } from "../api/socket";
import { useAuthStore } from "../store/authStore";

type ChatListNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "ChatList">,
  NativeStackNavigationProp<RootStackParamList>
>;

// m9: extracted avatar helper — isOnline prop으로 Discord 스타일 온라인 점 표시
function AvatarView({
  uri,
  name,
  size,
  style,
  isOnline,
}: {
  uri?: string | null;
  name?: string | null;
  size: number;
  style?: object;
  isOnline?: boolean;
}) {
  const radius = size / 2;
  const dotSize = Math.round(size * 0.28);
  return (
    <View style={[{ width: size, height: size }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: "rgba(139,92,246,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "bold" }}>
            {(name || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {/* 온라인/오프라인 점 — isOnline이 정의된 경우만 표시 */}
      {isOnline !== undefined && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: isOnline ? "#22C55E" : "#6B7280",
            borderWidth: 2,
            borderColor: "#10101E",
          }}
        />
      )}
    </View>
  );
}

// m7: ListHeader extracted outside component to prevent remount on every render
function ListHeader({
  pendingRequests,
  processingId,
  chatRoomsCount,
  onAccept,
  onReject,
}: {
  pendingRequests: PendingFriendRequest[];
  processingId: number | null;
  chatRoomsCount: number;
  onAccept: (req: PendingFriendRequest) => void;
  onReject: (req: PendingFriendRequest) => void;
}) {
  return (
    <>
      {pendingRequests.length > 0 && (
        <View style={styles.requestSection}>
          <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>친구 요청</Text>
          <View style={styles.requestCountBadge}>
            <Text style={styles.requestCountText}>{pendingRequests.length}</Text>
          </View>
        </View>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <AvatarView
                uri={req.senderProfileImageUrl}
                name={req.senderNickname}
                size={44}
                style={{ marginRight: 12 }}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{req.senderNickname || "알 수 없음"}</Text>
                <Text style={styles.requestSub}>친구 요청을 보냈어요</Text>
              </View>
              <View style={styles.requestActions}>
                {processingId === req.id ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <>
                    <Pressable onPress={() => onAccept(req)} style={styles.acceptBtn}>
                      <Text style={styles.acceptText}>수락</Text>
                    </Pressable>
                    <Pressable onPress={() => onReject(req)} style={styles.rejectBtn}>
                      <Text style={styles.rejectText}>거절</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      {chatRoomsCount > 0 && (
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>대화 목록</Text>
          <Text style={styles.sectionCount}>{chatRoomsCount}</Text>
        </View>
      )}
    </>
  );
}

export default function ChatListScreen() {
  const navigation = useNavigation<ChatListNavProp>();
  const [chatRooms, setChatRooms] = React.useState<ChatRoom[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<PendingFriendRequest[]>([]);
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showFriendPicker, setShowFriendPicker] = React.useState(false);
  const [showFriendManage, setShowFriendManage] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  // 온라인 상태 — 전역 스토어에서 읽기 (useIncomingCall이 App.tsx 시점에서 friend:status-change 수집)
  const onlineStatusMap = useAuthStore((s) => s.friendOnlineStatus);
  const setTotalUnreadCount = useAuthStore((s) => s.setTotalUnreadCount);
  // 1분마다 시간 표시 갱신
  const [, setTick] = React.useState(0);

  // 1분 interval — formatTime이 최신 now 기준으로 재계산되도록
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // chatRooms 변경 시 전역 미읽 총합 동기화 → 탭바 뱃지에 반영
  React.useEffect(() => {
    const total = chatRooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
    setTotalUnreadCount(total);
  }, [chatRooms, setTotalUnreadCount]);

  const loadData = React.useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const [rooms, requests, friendList] = await Promise.all([
        getChatRooms(),
        getFriendRequests(),
        getFriendList(),
      ]);
      setChatRooms(rooms);
      setPendingRequests(requests.filter((r) => r.status === "PENDING"));
      setFriends(friendList);
    } catch (e) {
      if (__DEV__) console.warn("ChatList load error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 화면 포커스될 때마다 갱신 (채팅 후 돌아오면 최신 메시지 반영)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData])
  );

  // M3: 소켓 리스너 — chat:receive + friend:status-change
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (data: {
      roomId: number;
      message: { content: string; createdAt: string; senderId?: number };
    }) => {
      const myUserId = useAuthStore.getState().me?.user?.id;
      const isOwnMessage = data.message.senderId !== undefined && data.message.senderId === myUserId;
      setChatRooms((prev) => {
        // M5: roomId가 목록에 없으면 다음 포커스 때 loadData()가 처리하므로 무시
        const exists = prev.some((r) => r.roomId === data.roomId);
        if (!exists) return prev;
        return [...prev]
          .map((room) =>
            room.roomId === data.roomId
              ? {
                  ...room,
                  lastMessage: data.message.content,
                  updatedAt: data.message.createdAt,
                  unreadCount: isOwnMessage ? room.unreadCount : room.unreadCount + 1,
                }
              : room
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    const handleConnect = () => loadData();

    socket.on("chat:receive", handleReceive);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("chat:receive", handleReceive);
      socket.off("connect", handleConnect);
    };
  }, [loadData]);

  const handleLeaveRoom = React.useCallback((room: ChatRoom) => {
    Alert.alert(
      "채팅방 나가기",
      `${room.friendNickname}님과의 채팅방을 나가시겠습니까?\n나가면 대화 내용이 삭제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "나가기",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveChatRoom(room.roomId);
              setChatRooms((prev) => prev.filter((r) => r.roomId !== room.roomId));
            } catch (e: any) {
              const status = e?.response?.status;
              if (status === 404) {
                // 이미 존재하지 않는 방 — 목록에서 제거
                setChatRooms((prev) => prev.filter((r) => r.roomId !== room.roomId));
              } else if (status === 403) {
                Alert.alert("오류", "해당 채팅방에 접근 권한이 없습니다.");
              } else {
                Alert.alert("오류", "채팅방 나가기에 실패했습니다. 다시 시도해주세요.");
              }
            }
          },
        },
      ]
    );
  }, []);

  const handleOpenChat = React.useCallback(
    (room: ChatRoom) => {
      // 채팅방 열면 미읽 카운트 낙관적 초기화 (chat:join이 서버에서 읽음 처리)
      setChatRooms((prev) =>
        prev.map((r) => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r))
      );
      navigation.navigate("Chat", {
        roomId: room.roomId,
        friendNickname: room.friendNickname,
        friendProfileImageUrl: room.friendProfileImageUrl ?? undefined,
      });
    },
    [navigation]
  );

  const handleStartChatWithFriend = React.useCallback(
    async (friend: Friend) => {
      setShowFriendPicker(false);
      setShowFriendManage(false);
      try {
        const room = await createChatRoom(friend.userId);
        navigation.navigate("Chat", {
          roomId: room.roomId,
          friendNickname: friend.nickname ?? "알 수 없음",
          friendProfileImageUrl: friend.profileImageUrl ?? undefined,
        });
      } catch (e) {
        if (__DEV__) console.error("Open chat error:", e);
        Alert.alert("오류", "채팅방을 열 수 없습니다.");
      }
    },
    [navigation]
  );

  // m5: loadData() 제거 — 낙관적 업데이트만으로 충분 (다음 포커스 시 서버에서 새로고침)
  const handleAccept = React.useCallback(
    async (req: PendingFriendRequest) => {
      setProcessingId(req.id);
      try {
        await acceptFriendRequest(req.id);
        setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      } catch {
        Alert.alert("오류", "요청 처리에 실패했습니다.");
      } finally {
        setProcessingId(null);
      }
    },
    []
  );

  const handleReject = React.useCallback(async (req: PendingFriendRequest) => {
    setProcessingId(req.id);
    try {
      await rejectFriendRequest(req.id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch {
      Alert.alert("오류", "요청 처리에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleDeleteFriend = React.useCallback((friend: Friend) => {
    Alert.alert(`${friend.nickname}님을 삭제할까요?`, "친구 목록에서 삭제됩니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFriend(friend.friendshipId);
            setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
          } catch {
            Alert.alert("오류", "친구 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  }, []);

  const handleBlockFriend = React.useCallback((friend: Friend) => {
    Alert.alert(
      `${friend.nickname}님을 차단할까요?`,
      "차단하면 친구 관계가 해제되고 이후 매칭에서 만나지 않습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "차단",
          style: "destructive",
          onPress: async () => {
            try {
              await blockFriend(friend.friendshipId);
              setFriends((prev) => prev.filter((f) => f.friendshipId !== friend.friendshipId));
            } catch {
              Alert.alert("오류", "차단에 실패했습니다.");
            }
          },
        },
      ]
    );
  }, []);

  // m3: Invalid Date 방어 + 음수 diff(서버/클라이언트 시계 오차) 처리
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "방금";
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "방금";
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "어제";
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    }
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  // ─── Render Helpers ─────────────────────────────────────────────

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const unread = item.unreadCount ?? 0;
    // friendId 기반으로 온라인 상태 조회 (undefined = 한번도 status 수신 안 함 → 점 미표시)
    const isOnline = onlineStatusMap[item.friendId];
    return (
      <Pressable
        style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
        onPress={() => handleOpenChat(item)}
        onLongPress={() => handleLeaveRoom(item)}
        delayLongPress={500}
      >
        <AvatarView
          uri={item.friendProfileImageUrl}
          name={item.friendNickname}
          size={52}
          style={{ marginRight: 14 }}
          isOnline={isOnline}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName}>{item.friendNickname}</Text>
            <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <View style={styles.chatBottom}>
            <Text style={styles.chatLastMsg} numberOfLines={1}>
              {item.lastMessage || "대화를 시작해보세요 👋"}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? "99+" : String(unread)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <ListHeader
      pendingRequests={pendingRequests}
      processingId={processingId}
      chatRoomsCount={chatRooms.length}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );

  // ─── Main Render ─────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#10101E", "#16213E"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>채팅</Text>
            {(() => {
              const totalUnread = chatRooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
              return totalUnread > 0 ? (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>{totalUnread > 99 ? "99+" : totalUnread}</Text>
                </View>
              ) : null;
            })()}
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setShowFriendManage(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnIcon}>👥</Text>
            </Pressable>
            <Pressable onPress={() => setShowFriendPicker(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnIcon}>✏️</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="rgba(255,255,255,0.6)" />
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => String(item.roomId)}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadData(true);
              }}
              tintColor="rgba(255,255,255,0.5)"
            />
          }
          ListEmptyComponent={
            pendingRequests.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>아직 채팅이 없어요</Text>
                <Text style={styles.emptySub}>
                  매칭 후 친구를 추가하면{"\n"}채팅을 시작할 수 있어요
                </Text>
                <Pressable
                  onPress={() => setShowFriendPicker(true)}
                  style={styles.emptyStartBtn}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#7C3AED"]}
                    style={styles.emptyStartGradient}
                  >
                    <Text style={styles.emptyStartText}>친구에게 먼저 말 걸기</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ✏️ 새 채팅 — 친구 선택 모달 */}
      <Modal visible={showFriendPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFriendPicker(false)} />
          <View style={styles.sheet}>
            <LinearGradient colors={["#1A1A2E", "#16213E"]} style={StyleSheet.absoluteFill} />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>채팅 시작하기</Text>
            {friends.length === 0 ? (
              <View style={styles.noFriendWrap}>
                <Text style={styles.noFriendText}>
                  아직 친구가 없어요{"\n"}매칭 후 친구를 추가해보세요!
                </Text>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => String(item.friendshipId)}
                style={styles.friendPickList}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.friendPickRow, pressed && { opacity: 0.7 }]}
                    onPress={() => handleStartChatWithFriend(item)}
                  >
                    <AvatarView
                      uri={item.profileImageUrl}
                      name={item.nickname}
                      size={44}
                      style={{ marginRight: 14 }}
                    />
                    <Text style={styles.friendPickName}>{item.nickname}</Text>
                    <Text style={styles.friendPickArrow}>›</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 👥 친구 관리 모달 */}
      <Modal visible={showFriendManage} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFriendManage(false)} />
          <View style={styles.sheet}>
            <LinearGradient colors={["#1A1A2E", "#16213E"]} style={StyleSheet.absoluteFill} />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>친구 관리</Text>
            {friends.length === 0 ? (
              <View style={styles.noFriendWrap}>
                <Text style={styles.noFriendText}>
                  아직 친구가 없어요{"\n"}매칭 후 친구를 추가해보세요!
                </Text>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => String(item.friendshipId)}
                style={styles.friendPickList}
                renderItem={({ item }) => (
                  <View style={styles.friendManageRow}>
                    <AvatarView
                      uri={item.profileImageUrl}
                      name={item.nickname}
                      size={44}
                      style={{ marginRight: 14 }}
                    />
                    <View style={styles.friendManageInfo}>
                      <Text style={styles.friendPickName}>{item.nickname}</Text>
                    </View>
                    <View style={styles.friendManageActions}>
                      <Pressable
                        onPress={() => handleStartChatWithFriend(item)}
                        style={styles.manageBtn}
                      >
                        <Text style={styles.manageBtnText}>💬</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteFriend(item)}
                        style={[styles.manageBtn, styles.manageBtnDanger]}
                      >
                        <Text style={styles.manageBtnText}>🗑</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleBlockFriend(item)}
                        style={[styles.manageBtn, styles.manageBtnDanger]}
                      >
                        <Text style={styles.manageBtnText}>🚫</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerUnreadBadge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerUnreadText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 8 },
  headerBtnIcon: { fontSize: 20 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 20, flexGrow: 1 },
  // Section
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  sectionCount: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
    fontWeight: "500",
  },
  requestCountBadge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  requestCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  // Friend Requests
  requestSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    overflow: "hidden",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  requestInfo: { flex: 1 },
  requestName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  requestSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  rejectBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rejectText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  // Chat Rows
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  chatRowPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  chatContent: { flex: 1 },
  chatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  chatTime: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  chatBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatLastMsg: { flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 14 },
  // 미읽 메시지 뱃지
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStartBtn: { borderRadius: 16, overflow: "hidden" },
  emptyStartGradient: { paddingHorizontal: 28, paddingVertical: 14 },
  emptyStartText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    maxHeight: "75%",
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  noFriendWrap: { padding: 40, alignItems: "center" },
  noFriendText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  friendPickList: { flex: 1 },
  friendPickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  friendPickName: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "500" },
  friendPickArrow: { color: "rgba(255,255,255,0.3)", fontSize: 20 },
  // Friend Manage
  friendManageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  friendManageInfo: { flex: 1 },
  friendManageActions: { flexDirection: "row", gap: 6 },
  manageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  manageBtnDanger: { backgroundColor: "rgba(239,68,68,0.15)" },
  manageBtnText: { fontSize: 16 },
});
