import { Image, StyleSheet, Text, View } from "react-native";

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
};

export function UserAvatar({ name, uri, size = 48 }: Props) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: Math.max(16, size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#e5e7eb",
  },
  fallback: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    justifyContent: "center",
  },
  initial: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
