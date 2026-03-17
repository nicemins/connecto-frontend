import * as React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/authStore";
import { updateProfile, updateProfileImage } from "../api/profile";
import { login, getMe, logout as logoutApi, deleteAccount } from "../api/auth";
import { updateLanguages } from "../api/languages";

type MyPageNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "MyPage">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function MyPageScreen() {
  const navigation = useNavigation<MyPageNavigationProp>();
  const { me, setMe, logout } = useAuthStore();

  const [nickname, setNickname] = React.useState(me?.profile?.nickname ?? "");
  const [bio, setBio] = React.useState(me?.profile?.bio ?? "");
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // SEC-L3: 회원 탈퇴 재인증 Modal 상태
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [langEditing, setLangEditing] = React.useState(false);
  const [editNative, setEditNative] = React.useState<string | null>(null);
  const [editLearning, setEditLearning] = React.useState<string | null>(null);
  const [editLevel, setEditLevel] = React.useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("BEGINNER");
  const [langSaving, setLangSaving] = React.useState(false);

  React.useEffect(() => {
    getMe()
      .then((updated) => {
        setMe(updated);
        setNickname(updated.profile?.nickname ?? "");
        setBio(updated.profile?.bio ?? "");
      })
      .catch((e) => console.warn("getMe error:", e)); // H-6: 실패 시 최소 로그
  }, [setMe]);

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try { await logoutApi(); } catch (e) { console.warn("logoutApi error:", e); } // H-5: 실패 로그
          await logout();
          navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert("회원 탈퇴", "탈퇴하면 모든 데이터가 삭제됩니다.\n정말 탈퇴하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "계속",
        style: "destructive",
        // SEC-L3: Alert 확인 후 비밀번호 재인증 Modal 표시
        onPress: () => setShowDeleteModal(true),
      },
    ]);
  };

  // SEC-L3: 비밀번호 재인증 후 탈퇴 처리
  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      Alert.alert("입력 오류", "비밀번호를 입력해주세요.");
      return;
    }
    const email = me?.user?.email;
    if (!email) {
      Alert.alert("오류", "계정 정보를 찾을 수 없습니다.");
      return;
    }
    setDeleteLoading(true);
    try {
      await login(email, deletePassword);
    } catch {
      Alert.alert("인증 실패", "비밀번호가 올바르지 않습니다.");
      setDeleteLoading(false);
      return;
    }
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      await logout();
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    } catch {
      Alert.alert("오류", "회원 탈퇴 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setDeleteLoading(false);
      setDeletePassword("");
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    // SEC-M4: fileSize undefined 시 차단 (기존 코드는 undefined를 통과시켰음)
    if (asset.fileSize === undefined || asset.fileSize === null) {
      Alert.alert("오류", "파일 크기를 확인할 수 없습니다.");
      return;
    }
    if (asset.fileSize > MAX_SIZE) {
      Alert.alert("파일 크기 초과", "이미지는 5MB 이하만 업로드할 수 있습니다.");
      return;
    }
    // SEC-M4: 유효하지 않은 이미지 차단 (너비/높이 0)
    if (!asset.width || !asset.height || asset.width <= 0 || asset.height <= 0) {
      Alert.alert("오류", "유효하지 않은 이미지입니다.");
      return;
    }

    setUploadingImage(true);
    try {
      await updateProfileImage(asset.uri);
      const updated = await getMe();
      setMe(updated);
    } catch {
      Alert.alert("오류", "이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert("입력 오류", "닉네임을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim(), bio: bio.trim() || undefined });
      const updated = await getMe();
      setMe(updated);
      setEditing(false);
      Alert.alert("저장 완료", "프로필이 업데이트되었습니다.");
    } catch {
      Alert.alert("오류", "프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const LANGUAGES = ["ko", "en", "ja", "zh", "es", "fr", "de"];
  const EDIT_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

  const profileImageUrl = me?.profile?.profileImageUrl ?? null;
  const nativeLangs = me?.languages?.filter((l) => l.type === "NATIVE") ?? [];
  const learningLangs = me?.languages?.filter((l) => l.type === "LEARNING") ?? [];

  const handleLangEditStart = () => {
    setEditNative(nativeLangs[0]?.languageCode ?? null);
    setEditLearning(learningLangs[0]?.languageCode ?? null);
    setEditLevel((learningLangs[0]?.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ?? "BEGINNER");
    setLangEditing(true);
  };

  const handleLangSave = async () => {
    if (!editNative) { Alert.alert("선택 필요", "모국어를 선택해주세요."); return; }
    if (!editLearning) { Alert.alert("선택 필요", "학습 언어를 선택해주세요."); return; }
    setLangSaving(true);
    try {
      await updateLanguages([
        { languageCode: editNative, type: "NATIVE", level: "NATIVE" },
        { languageCode: editLearning, type: "LEARNING", level: editLevel },
      ]);
      const updated = await getMe();
      setMe(updated);
      setLangEditing(false);
    } catch {
      Alert.alert("오류", "언어 설정 저장에 실패했습니다.");
    } finally {
      setLangSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#10101E", "#16213E"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 프로필 이미지 */}
          <View className="items-center mt-8 mb-6">
            <Pressable onPress={handlePickImage} disabled={uploadingImage} style={styles.profileContainer}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={["#FFB88C", "#F093A0", "#B88FCE"]}
                  style={styles.profileImage}
                />
              )}
              {/* 카메라 아이콘 오버레이 */}
              <View style={styles.cameraOverlay}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.cameraIcon}>📷</Text>
                )}
              </View>
            </Pressable>
            <Text className="text-white text-xl font-bold mt-3">
              {me?.profile?.nickname ?? me?.user?.email ?? ""}
            </Text>
            {me?.user?.email && (
              <Text className="text-white/50 text-sm mt-1">{me.user.email}</Text>
            )}
          </View>

          {/* 프로필 편집 카드 */}
          <View className="mx-4 mb-4 p-4 rounded-3xl bg-white/10 border border-white/20">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold">프로필</Text>
              {!editing ? (
                <Pressable onPress={() => setEditing(true)}>
                  <Text className="text-purple-400 text-sm font-semibold">편집</Text>
                </Pressable>
              ) : (
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setEditing(false);
                      setNickname(me?.profile?.nickname ?? "");
                      setBio(me?.profile?.bio ?? "");
                    }}
                  >
                    <Text className="text-gray-400 text-sm">취소</Text>
                  </Pressable>
                  <Pressable onPress={handleSave} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#a78bfa" />
                    ) : (
                      <Text className="text-purple-400 text-sm font-semibold">저장</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            <View className="mb-3">
              <Text className="text-white/60 text-xs mb-1">닉네임</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="닉네임"
                  placeholderTextColor="#6b7280"
                  maxLength={30}
                />
              ) : (
                <Text className="text-white text-base">
                  {me?.profile?.nickname ?? "-"}
                </Text>
              )}
            </View>

            <View>
              <Text className="text-white/60 text-xs mb-1">소개</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="자기소개를 입력해주세요"
                  placeholderTextColor="#6b7280"
                  multiline
                  maxLength={500}
                />
              ) : (
                <Text className="text-white/80 text-sm">
                  {me?.profile?.bio ?? "소개가 없습니다."}
                </Text>
              )}
            </View>
          </View>

          {/* 계정 관리 카드 */}
          <View className="mx-4 mb-4 p-4 rounded-3xl bg-white/10 border border-white/20">
            <Text className="text-white text-lg font-bold mb-3">계정</Text>
            <Pressable
              onPress={handleLogout}
              className="h-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-2"
            >
              <Text className="text-white text-sm font-semibold">로그아웃</Text>
            </Pressable>
            <Pressable onPress={handleWithdraw} className="h-10 items-center justify-center">
              <Text className="text-red-400/70 text-xs">회원 탈퇴</Text>
            </Pressable>
          </View>

          {/* 언어 카드 */}
          <View className="mx-4 mb-4 p-4 rounded-3xl bg-white/10 border border-white/20">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white text-lg font-bold">언어</Text>
              {!langEditing ? (
                <Pressable onPress={handleLangEditStart}>
                  <Text className="text-purple-400 text-sm font-semibold">편집</Text>
                </Pressable>
              ) : (
                <View className="flex-row gap-3">
                  <Pressable onPress={() => setLangEditing(false)}>
                    <Text className="text-gray-400 text-sm">취소</Text>
                  </Pressable>
                  <Pressable onPress={handleLangSave} disabled={langSaving}>
                    {langSaving ? (
                      <ActivityIndicator size="small" color="#a78bfa" />
                    ) : (
                      <Text className="text-purple-400 text-sm font-semibold">저장</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {!langEditing ? (
              <>
                {nativeLangs.length > 0 && (
                  <View className="mb-2">
                    <Text className="text-white/60 text-xs mb-1">모국어</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {nativeLangs.map((l) => (
                        <View
                          key={l.id}
                          className="px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/50"
                        >
                          <Text className="text-purple-200 text-sm">
                            {l.languageCode.toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {learningLangs.length > 0 && (
                  <View>
                    <Text className="text-white/60 text-xs mb-1">학습 중</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {learningLangs.map((l) => (
                        <View
                          key={l.id}
                          className="px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/50"
                        >
                          <Text className="text-blue-200 text-sm">
                            {l.languageCode.toUpperCase()} · {l.level}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {nativeLangs.length === 0 && learningLangs.length === 0 && (
                  <Text className="text-white/40 text-sm">설정된 언어가 없습니다.</Text>
                )}
              </>
            ) : (
              <>
                <Text className="text-white/60 text-xs mb-2">모국어</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {LANGUAGES.map((lang) => {
                    const selected = editNative === lang;
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => setEditNative(lang)}
                        style={[styles.langChip, selected && styles.langChipSelected]}
                      >
                        <Text style={selected ? styles.langChipTextSelected : styles.langChipText}>
                          {lang.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="text-white/60 text-xs mb-2">학습 언어</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {LANGUAGES.map((lang) => {
                    const selected = editLearning === lang;
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => setEditLearning(lang)}
                        style={[styles.langChip, selected && styles.langChipSelected]}
                      >
                        <Text style={selected ? styles.langChipTextSelected : styles.langChipText}>
                          {lang.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="text-white/60 text-xs mb-2">학습 수준</Text>
                <View className="flex-row gap-2">
                  {EDIT_LEVELS.map((lv) => {
                    const selected = editLevel === lv;
                    return (
                      <Pressable
                        key={lv}
                        onPress={() => setEditLevel(lv)}
                        style={[styles.langChip, selected && styles.langChipSelected]}
                      >
                        <Text style={selected ? styles.langChipTextSelected : styles.langChipText}>
                          {lv}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* SEC-L3: 회원 탈퇴 재인증 Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeletePassword("");
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalCard}>
            <Text style={styles.deleteModalTitle}>탈퇴 확인</Text>
            <Text style={styles.deleteModalDesc}>
              비밀번호를 입력하여 본인 확인을 해주세요.
            </Text>
            <TextInput
              style={styles.deleteModalInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="비밀번호"
              placeholderTextColor="#9ca3af"
              maxLength={128}
              editable={!deleteLoading}
            />
            <Pressable
              onPress={handleConfirmDelete}
              disabled={deleteLoading}
              style={[styles.deleteModalButton, { backgroundColor: "#ef4444" }]}
            >
              {deleteLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteModalButtonText}>탈퇴하기</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setShowDeleteModal(false);
                setDeletePassword("");
              }}
              disabled={deleteLoading}
              style={[styles.deleteModalButton, { backgroundColor: "rgba(255,255,255,0.15)", marginTop: 8 }]}
            >
              <Text style={[styles.deleteModalButtonText, { color: "rgba(255,255,255,0.7)" }]}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    fontSize: 16,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  langChipSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#8b5cf6",
  },
  langChipText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
  langChipTextSelected: { color: "#fff", fontSize: 13, fontWeight: "600" },
  // SEC-L3: 탈퇴 재인증 Modal 스타일
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  deleteModalCard: {
    width: "100%",
    backgroundColor: "#1e1e2e",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  deleteModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  deleteModalDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  deleteModalInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
  },
  deleteModalButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
