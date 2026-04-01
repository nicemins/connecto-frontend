import * as React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { getBlockedUsers, unblockUser } from "../api/friends";
import type { BlockedUser } from "../api/friends";

type BlockListNavigationProp = NativeStackNavigationProp<RootStackParamList, "BlockList">;

function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}

export default function BlockListScreen() {
  const navigation = useNavigation<BlockListNavigationProp>();

  const [blocks, setBlocks] = React.useState<BlockedUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unblockingId, setUnblockingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    getBlockedUsers()
      .then((data) => setBlocks(data))
      .catch(() => Alert.alert("오류", "차단 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = React.useCallback(async (blockedUserId: number, nickname: string | null) => {
    Alert.alert(
      "차단 해제",
      `${nickname ?? "이 유저"}의 차단을 해제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "해제",
          onPress: async () => {
            setUnblockingId(blockedUserId);
            try {
              await unblockUser(blockedUserId);
              setBlocks((prev) => prev.filter((b) => b.blockedUserId !== blockedUserId));
            } catch {
              Alert.alert("오류", "차단 해제에 실패했습니다.");
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = unblockingId === item.blockedUserId;
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {(item.nickname ?? "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.nickname}>{item.nickname ?? "알 수 없음"}</Text>
            <Text style={styles.blockedAt}>{formatDate(item.blockedAt)} 차단</Text>
          </View>
        </View>
        <Pressable
          onPress={() => handleUnblock(item.blockedUserId, item.nickname)}
          disabled={isUnblocking}
          style={[styles.unblockBtn, isUnblocking && styles.unblockBtnDisabled]}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color="#f87171" />
          ) : (
            <Text style={styles.unblockText}>차단 해제</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#1e1b4b", "#0f172a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>차단 목록</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#a78bfa" />
          </View>
        ) : blocks.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>차단한 유저가 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={blocks}
            keyExtractor={(item) => String(item.blockedUserId)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 10 }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 22,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#374151",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4c1d95",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  itemInfo: {
    flex: 1,
  },
  nickname: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  blockedAt: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  unblockBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  unblockBtnDisabled: {
    opacity: 0.5,
  },
  unblockText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
  },
});
