import * as React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  size: number;
  colors: [string, string, string];
  style?: ViewStyle;
};

export default function CharacterBlob({ size, colors, style }: Props) {
  return (
    <View
      style={[
        styles.blob,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        locations={[0, 0.5, 1]}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      />
      <View style={[styles.faceRow, { top: size * 0.38 }]}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </View>
      <View style={[styles.faceRow, { top: size * 0.52 }]}>
        <View style={styles.mouth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  faceRow: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 11,
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
