import * as React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { navigationRef } from "../navigation/navigationRef";
import CharacterBlob from "./CharacterBlob";
import type { IncomingCallData } from "../hooks/useIncomingCall";

type Props = {
  incomingCall: IncomingCallData | null;
  onDismiss: () => void;
};

export default function IncomingCallModal({ incomingCall, onDismiss }: Props) {
  const handleAccept = React.useCallback(() => {
    if (!incomingCall) return;
    onDismiss();
    (navigationRef as any).current?.navigate("Call", {
      sessionId: incomingCall.sessionId,
      webrtcChannelId: incomingCall.webrtcChannelId,
      isOfferer: false,
    });
  }, [incomingCall, onDismiss]);

  const handleReject = React.useCallback(() => {
    // 거절 API 없음 — 팝업 닫기만 처리 (세션은 5분 후 서버 자동 정리)
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      visible={incomingCall !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleReject}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={["#3B0764", "#1E3A8A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* 캐릭터 */}
          <View style={styles.blobWrapper}>
            <CharacterBlob size={100} colors={["#A78BFA", "#7C3AED", "#4F46E5"]} />
          </View>

          {/* 텍스트 */}
          <Text style={styles.nickname}>
            {incomingCall?.callerNickname ?? ""}님이
          </Text>
          <Text style={styles.subtitle}>통화를 요청했어요</Text>

          {/* 버튼 */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleReject}
              style={[styles.button, styles.rejectButton]}
            >
              <Text style={styles.rejectText}>거절</Text>
            </Pressable>
            <Pressable
              onPress={handleAccept}
              style={[styles.button, styles.acceptButton]}
            >
              <Text style={styles.acceptText}>수락</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  blobWrapper: {
    marginBottom: 20,
  },
  nickname: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  acceptButton: {
    backgroundColor: "#7C3AED",
  },
  rejectText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
