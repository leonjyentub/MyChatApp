import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getChats } from "../../api/chat";
import { Screen } from "../../components/Screen";
import { commonStyles } from "../../components/styles";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth } from "../../context/AuthContext";
import type { ChatSummary } from "../../types/chat";

function formatTime(value: string | null) {
  if (!value) return "尚無訊息";
  return new Date(value).toLocaleString();
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getChats(user.id)
        .then(setChats)
        .catch((err) =>
          setError(err instanceof Error ? err.message : "載入聊天列表失敗"),
        );
    }, [user]),
  );

  return (
    <Screen>
      {error ? <Text style={commonStyles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.list}
        data={chats}
        keyExtractor={(item) => item.friend.id}
        ListEmptyComponent={
          <Text style={styles.empty}>聊天列表目前是空的</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={commonStyles.row}
            onPress={() => router.push(`/chat/${item.friend.id}`)}
          >
            <UserAvatar name={item.friend.name} uri={item.friend.avatar_url} />
            <View style={styles.rowText}>
              <View style={styles.titleRow}>
                <Text style={commonStyles.rowTitle}>{item.friend.name}</Text>
                <Text style={styles.time}>{formatTime(item.last_time)}</Text>
              </View>
              <Text numberOfLines={1} style={commonStyles.rowMeta}>
                {item.last_message?.text ?? "點擊開始聊天"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: "#64748b",
    paddingTop: 32,
    textAlign: "center",
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  rowText: {
    flex: 1,
  },
  time: {
    color: "#64748b",
    fontSize: 12,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
});
