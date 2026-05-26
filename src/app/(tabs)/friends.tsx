import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addFriend, getFriends } from "../../api/chat";
import { Screen } from "../../components/Screen";
import { commonStyles } from "../../components/styles";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types/chat";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [friendId, setFriendId] = useState("");
  const [error, setError] = useState("");

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const data = await getFriends(user.id);
    setFriends(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFriends().catch((err) =>
        setError(err instanceof Error ? err.message : "載入好友失敗"),
      );
    }, [loadFriends]),
  );

  const onAddFriend = async () => {
    if (!user || !friendId.trim()) return;
    setError("");
    try {
      await addFriend(user.id, friendId.trim());
      setFriendId("");
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : "加入好友失敗");
    }
  };

  return (
    <Screen>
      <View style={styles.addBox}>
        <Text style={styles.myId}>我的 ID：{user?.id}</Text>
        <View style={styles.addRow}>
          <TextInput
            autoCapitalize="none"
            placeholder="輸入好友 ID"
            style={[commonStyles.input, styles.addInput]}
            value={friendId}
            onChangeText={setFriendId}
          />
          <Pressable style={styles.addButton} onPress={onAddFriend}>
            <Text style={commonStyles.buttonText}>加入</Text>
          </Pressable>
        </View>
        {error ? <Text style={commonStyles.error}>{error}</Text> : null}
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={friends}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>尚未加入好友</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={commonStyles.row}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <UserAvatar name={item.name} uri={item.avatar_url} />
            <View style={styles.rowText}>
              <Text style={commonStyles.rowTitle}>{item.name}</Text>
              <Text style={commonStyles.rowMeta}>ID：{item.id}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBox: {
    gap: 10,
    marginBottom: 16,
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    ...commonStyles.button,
    minWidth: 76,
  },
  empty: {
    color: "#64748b",
    paddingTop: 32,
    textAlign: "center",
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  myId: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  rowText: {
    flex: 1,
  },
});
