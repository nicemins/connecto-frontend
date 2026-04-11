import * as React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { getChatMessages, sendChatImage, type ChatMessage } from "../api/chat";
import { getSocket } from "../api/socket";
import { useAuthStore } from "../store/authStore";
import * as ImagePicker from "expo-image-picker";

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Chat">;

type ChatScreenRouteProp = {
  key: string;
  name: "Chat";
  params: { roomId: number; friendNickname: string; friendProfileImageUrl?: string };
};

// C3: 전송 중 메시지 큐 타입 (tempId 기반으로 echo 매칭)
type PendingMsg = { tempId: number; content: string; time: number };

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateSeparator = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, today)) return "오늘";
  if (isSameDay(date, yesterday)) return "어제";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
};

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { roomId, friendNickname, friendProfileImageUrl } = route.params;

  const me = useAuthStore((s) => s.me);
  const myUserId = me?.user?.id;

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasNext, setHasNext] = React.useState(false);
  const [page, setPage] = React.useState(0);
  // C2: ref 기반 중복 전송 방지 (state는 UI disabled용)

  const listRef = React.useRef<FlatList>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  // C3: 전송 중 메시지 큐 — content 기반이 아닌 tempId 기반 매칭
  const pendingQueueRef = React.useRef<PendingMsg[]>([]);
  const latestIdRef = React.useRef<number>(-1);
  // M1: 새 메시지 추가(맨 아래)인지 페이지네이션(맨 위)인지 구분
  const isAppendingRef = React.useRef(false);
  // 이미지 전송
  const [isImageSending, setIsImageSending] = React.useState(false);
  const isImageSendingRef = React.useRef(false);
  // 상대방 마지막 읽음 메시지 ID (이하 내 메시지에 ✓✓ 표시)
  const [partnerLastReadId, setPartnerLastReadId] = React.useState(-1);
  // 타이핑 인디케이터
  const [partnerTyping, setPartnerTyping] = React.useState(false);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = React.useRef(0);

  // 메시지 히스토리 로드
  const loadMessages = React.useCallback(async (pageNum = 0) => {
    try {
      // m4: spread 불필요 — reverse()는 이미 새 배열인 res.messages를 직접 수정
      const res = await getChatMessages(roomId, pageNum, 50);
      const sorted = res.messages.reverse();
      if (pageNum === 0) {
        isAppendingRef.current = true; // 초기 로드 후 맨 아래 스크롤
        setMessages(sorted);
        if (sorted.length > 0) {
          latestIdRef.current = sorted[sorted.length - 1].id;
        }
        // 초기 진입 시 백엔드에서 내려온 partnerLastReadMessageId로 즉시 읽음 렌더링
        // (소켓 chat:read 이벤트를 기다리지 않아 깜빡임 없음)
        if (res.partnerLastReadMessageId !== undefined) {
          setPartnerLastReadId(res.partnerLastReadMessageId);
        }
      } else {
        setMessages((prev) => [...sorted, ...prev]);
      }
      setHasNext(res.hasNext);
      setPage(pageNum);
    } catch (e) {
      if (__DEV__) console.error("Load messages error:", e);
      Alert.alert("오류", "메시지를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);


  // M1: 새 메시지 추가(append)일 때만 맨 아래로 스크롤
  React.useEffect(() => {
    if (messages.length > 0 && isAppendingRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      isAppendingRef.current = false;
    }
  }, [messages.length]);

  // chat:join — 채팅방 진입 시 소켓 룸에 참가
  // useFocusEffect: 화면 포커스될 때마다 chat:join 재emit + 메시지 갱신
  // (다른 탭/화면에서 돌아올 때 소켓 룸이 끊겨 실시간 메시지 누락 방지)
  useFocusEffect(
    React.useCallback(() => {
      const socket = getSocket();
      if (socket) {
        socket.emit("chat:join", { roomId });
      }
      // 포커스 시 이전 상태 초기화 후 로드 (나가기 후 재진입 시 잔여 메시지 제거)
      setMessages([]);
      loadMessages(0);

      return () => {
        const s = getSocket();
        if (s) s.emit("chat:leave", { roomId });
      };
    }, [roomId, loadMessages])
  );

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    // 소켓 재연결 시 룸 재참가
    const handleReconnect = () => socket.emit("chat:join", { roomId });
    socket.on("connect", handleReconnect);
    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [roomId]);

  // 소켓 실시간 수신
  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (data: { roomId: number; message: ChatMessage }) => {
      if (data.roomId !== roomId) return;
      const msg = data.message;

      // C3: 내 echo — pendingQueue에서 같은 content의 첫 번째 항목을 tempId로 교체
      if (msg.senderId === myUserId) {
        const idx = pendingQueueRef.current.findIndex(
          (p) => p.content === msg.content && Date.now() - p.time < 15000
        );
        if (idx !== -1) {
          const { tempId } = pendingQueueRef.current[idx];
          pendingQueueRef.current.splice(idx, 1);
          if (msg.id > latestIdRef.current) latestIdRef.current = msg.id;
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? msg : m))
          );
          return;
        }
      }

      if (msg.id > latestIdRef.current) latestIdRef.current = msg.id;
      isAppendingRef.current = true;
      setMessages((prev) => {
        // dedup: 이미지 REST 확정 후 소켓 echo 중복 방지
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // 채팅방 포커스 중 상대방 메시지 수신 → 읽음 처리 emit
      // 상대방 메시지일 때만 읽음 emit (내 echo는 제외)
      if (msg.senderId !== myUserId) {
        socket.emit("chat:read", { roomId });
      }
    };

    const handleError = (data: { message: string }) => {
      Alert.alert("전송 실패", data.message);
    };

    const handleReconnect = () => {
      loadMessages(0);
    };

    // 타이핑 인디케이터 — 상대방 입력 중 표시
    const handleTyping = (data: { roomId: number }) => {
      if (data.roomId !== roomId) return;
      setPartnerTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setPartnerTyping(false), 3000);
    };

    // 읽음 표시 — 상대방이 내 메시지를 읽었을 때
    const handleRead = (data: { roomId: number; readerId: number; lastReadMessageId: number }) => {
      if (data.roomId !== roomId) return;
      setPartnerLastReadId((prev) => Math.max(prev, data.lastReadMessageId));
    };

    socket.on("chat:receive", handleReceive);
    socket.on("chat:error", handleError);
    socket.on("connect", handleReconnect);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:read", handleRead);
    return () => {
      socket.off("chat:receive", handleReceive);
      socket.off("chat:error", handleError);
      socket.off("connect", handleReconnect);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:read", handleRead);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [roomId, myUserId, loadMessages]);

  // 메시지 전송
  const handleSend = React.useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !myUserId) return;

    const socket = getSocket();
    if (!socket || !socket.connected) {
      Alert.alert("오류", "서버와 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const tempId = -(Date.now());
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: myUserId,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    // C3: 큐에 추가 (tempId 기반 echo 매칭)
    pendingQueueRef.current.push({ tempId, content: trimmed, time: Date.now() });

    isAppendingRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);
    setInput("");

    socket.emit("chat:send", { roomId, content: trimmed });

    // 15초 후에도 echo 미수신 시 pending 정리 + 서버 상태로 강제 갱신
    setTimeout(() => {
      const stillPending = pendingQueueRef.current.some((p) => p.tempId === tempId);
      if (stillPending) {
        pendingQueueRef.current = pendingQueueRef.current.filter((p) => p.tempId !== tempId);
        loadMessages(0);
      }
    }, 15000);
  }, [input, myUserId, roomId, loadMessages]);

  // 이미지 전송
  const handleSendImage = React.useCallback(async () => {
    if (isImageSendingRef.current || !myUserId) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert("이미지 크기 초과", "5MB 이하의 이미지만 전송할 수 있어요.");
      return;
    }

    const tempId = -(Date.now());
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: myUserId,
      content: null,
      imageUrl: asset.uri,
      messageType: "IMAGE",
      createdAt: new Date().toISOString(),
    };

    isImageSendingRef.current = true;
    setIsImageSending(true);
    isAppendingRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const sent = await sendChatImage(roomId, asset.uri);
      if (sent.id > latestIdRef.current) latestIdRef.current = sent.id;
      setMessages((prev) => {
        // socket echo가 REST보다 먼저 도착한 경우 중복 방지
        if (prev.some((m) => m.id === sent.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? sent : m));
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("전송 실패", "이미지를 전송하지 못했습니다.");
    } finally {
      isImageSendingRef.current = false;
      setIsImageSending(false);
    }
  }, [myUserId, roomId]);

  // M2: 스크롤 상단 감지 → 이전 메시지 로드 + 하단 버튼 표시
  const handleScroll = React.useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentOffset.y < 80 && hasNext && !isLoading) {
        loadMessages(page + 1);
      }
      const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      setShowScrollBottom(distFromBottom > 120);
    },
    [hasNext, isLoading, page, loadMessages]
  );

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === myUserId;
    const isPending = item.id < 0;
    const isImage = item.messageType === "IMAGE" || !!item.imageUrl;
    const isRead = isMine && !isPending && item.id > 0 && partnerLastReadId >= item.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate =
      index === 0 ||
      (prevMsg !== null && !isSameDay(new Date(prevMsg.createdAt), new Date(item.createdAt)));
    const timeStr = isPending
      ? "전송 중..."
      : new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    // 내 메시지: [읽음] [버블+시간] — 읽음이 버블 왼쪽에 inline으로 표시
    const bubbleContent = isImage ? (
      <View>
        <Image source={{ uri: item.imageUrl! }} style={styles.chatImage} resizeMode="cover" />
        {isPending && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
      </View>
    ) : (
      <Text style={isMine ? styles.messageTextMine : styles.messageTextOther}>
        {item.content}
      </Text>
    );

    return (
      <React.Fragment key={item.id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(new Date(item.createdAt))}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        {isMine ? (
          <View style={styles.messageWrapMine}>
            {isRead && <Text style={styles.readLabel}>읽음</Text>}
            <View style={styles.messageColMine}>
              <View style={[styles.messageBubble, styles.bubbleMine, isPending && styles.bubblePending, isImage && styles.bubbleImage]}>
                {bubbleContent}
              </View>
              <Text style={[styles.messageTime, styles.messageTimeMine]}>{timeStr}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.messageWrapOther}>
            <View style={[styles.messageBubble, styles.bubbleOther, isImage && styles.bubbleImage]}>
              {bubbleContent}
            </View>
            <Text style={[styles.messageTime, styles.messageTimeOther]}>{timeStr}</Text>
          </View>
        )}
      </React.Fragment>
    );
  };

  // m6: 글자 수 표시 (900자 이상일 때)
  const charCount = input.length;
  const showCharCount = charCount >= 900;

  return (
    // m2: KeyboardAvoidingView가 FlatList + 입력창을 함께 감싸야 iOS에서 키보드에 가려지지 않음
    <View style={styles.root}>
      <LinearGradient colors={["#10101E", "#16213E"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          {friendProfileImageUrl ? (
            <Image source={{ uri: friendProfileImageUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {friendNickname.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.headerNickname}>{friendNickname}</Text>
        </View>
      </SafeAreaView>

      {/* 스크롤 to bottom 버튼 */}
      {showScrollBottom && (
        <Pressable
          style={styles.scrollBottomBtn}
          onPress={() => {
            listRef.current?.scrollToEnd({ animated: true });
            setShowScrollBottom(false);
          }}
        >
          <Text style={styles.scrollBottomIcon}>↓</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* 메시지 목록 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="rgba(255,255,255,0.6)" />
            <Text style={styles.loadingText}>대화 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messageList}
            onScroll={handleScroll}           // M2: 상단 스크롤 감지
            scrollEventThrottle={200}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>첫 메시지를 보내보세요 👋</Text>
              </View>
            }
          />
        )}

        {/* 입력창 */}
        <SafeAreaView edges={["bottom"]} style={styles.inputSafeArea}>
          {/* 타이핑 인디케이터 */}
          {partnerTyping && (
            <Text style={styles.typingIndicator}>{friendNickname}이(가) 입력 중...</Text>
          )}
          {/* m6: 900자 이상 글자 수 표시 */}
          {showCharCount && (
            <Text style={styles.charCount}>{charCount}/1000</Text>
          )}
          <View style={styles.inputRow}>
            <Pressable
              onPress={handleSendImage}
              disabled={isImageSending}
              style={[styles.imageButton, isImageSending && styles.imageButtonDisabled]}
            >
              {isImageSending
                ? <ActivityIndicator size="small" color="rgba(139,92,246,0.8)" />
                : <Text style={styles.imageButtonIcon}>📷</Text>
              }
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(text) => {
                setInput(text);
                // 타이핑 이벤트 emit — 1초 쓰로틀
                if (text.length > 0) {
                  const now = Date.now();
                  if (now - lastTypingEmitRef.current > 1000) {
                    lastTypingEmitRef.current = now;
                    getSocket()?.emit("chat:typing", { roomId });
                  }
                }
              }}
              placeholder="메시지 입력..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim()}
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backButton: { paddingRight: 12, paddingVertical: 4 },
  backIcon: { color: "#fff", fontSize: 22 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(139,92,246,0.4)",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  headerAvatarInitial: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  headerNickname: { color: "#fff", fontSize: 17, fontWeight: "600" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "rgba(255,255,255,0.5)", marginTop: 8, fontSize: 14 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { color: "rgba(255,255,255,0.4)", fontSize: 15 },
  // 내 메시지: row = [읽음] + [버블 컬럼]
  messageWrapMine: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  messageColMine: { maxWidth: 260 },
  // 상대 메시지: 단순 컬럼
  messageWrapOther: { alignSelf: "flex-start", marginBottom: 8, maxWidth: 260 },
  readLabel: {
    color: "rgba(139,92,246,0.75)",
    fontSize: 10,
    marginRight: 4,
    marginBottom: 14, // timestamp 높이만큼 올려서 버블 하단에 정렬
  },
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: "#8B5CF6" },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  bubblePending: { opacity: 0.6 },
  messageTextMine: { color: "#fff", fontSize: 15, lineHeight: 21 },
  messageTextOther: { color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 21 },
  messageTime: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 3 },
  messageTimeMine: { textAlign: "right" },
  messageTimeOther: { textAlign: "left" },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  dateSeparatorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.15)" },
  dateSeparatorText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginHorizontal: 12,
    fontWeight: "500",
  },
  inputSafeArea: { backgroundColor: "transparent" },
  typingIndicator: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
    fontStyle: "italic",
  },
  charCount: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    textAlign: "right",
    paddingRight: 16,
    paddingTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#8B5CF6",
    alignItems: "center", justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "rgba(139,92,246,0.3)" },
  sendIcon: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  // 스크롤 to bottom 버튼
  scrollBottomBtn: {
    position: "absolute",
    right: 16,
    bottom: 90,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(139,92,246,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollBottomIcon: { color: "#fff", fontSize: 18, fontWeight: "bold", lineHeight: 22 },
  // 이미지 버튼
  imageButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  imageButtonDisabled: { opacity: 0.4 },
  imageButtonIcon: { fontSize: 18 },
  // 이미지 버블
  bubbleImage: { padding: 4, backgroundColor: "transparent" },
  chatImage: { width: 200, height: 150, borderRadius: 12 },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
});
