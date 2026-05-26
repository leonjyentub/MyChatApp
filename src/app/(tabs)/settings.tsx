import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { updateProfile } from "../../api/chat";
import { Screen } from "../../components/Screen";
import { commonStyles } from "../../components/styles";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen() {
  const { user, setUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [birthday, setBirthday] = useState(user?.birthday ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSave = async () => {
    if (!user) return;
    setMessage("");
    setError("");
    try {
      const updated = await updateProfile(user.id, {
        name,
        birthday: birthday || null,
        avatar_url: avatarUrl || null,
      });
      setUser(updated);
      setMessage("已儲存個人設定");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const onSignOut = () => {
    signOut();
    router.replace("/");
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.profileHeader}>
          <UserAvatar name={name} uri={avatarUrl} size={72} />
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={commonStyles.rowMeta}>ID：{user?.id}</Text>
          </View>
        </View>
        <TextInput placeholder="姓名" style={commonStyles.input} value={name} onChangeText={setName} />
        <TextInput placeholder="生日，例如 2001-01-01" style={commonStyles.input} value={birthday} onChangeText={setBirthday} />
        <TextInput
          autoCapitalize="none"
          placeholder="頭像圖片 URL"
          style={commonStyles.input}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={commonStyles.error}>{error}</Text> : null}
        <Pressable style={commonStyles.button} onPress={onSave}>
          <Text style={commonStyles.buttonText}>儲存設定</Text>
        </Pressable>
        <Pressable style={commonStyles.secondaryButton} onPress={onSignOut}>
          <Text style={commonStyles.secondaryButtonText}>登出</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingBottom: 24,
  },
  name: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 8,
  },
  profileText: {
    flex: 1,
  },
  success: {
    color: "#16a34a",
    fontSize: 14,
  },
});
