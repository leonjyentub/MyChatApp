import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiProvider, updateProfile } from "../../api/chat";
import { Screen } from "../../components/Screen";
import { commonStyles } from "../../components/styles";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen() {
  const { user, setUser, signOut, apiProvider, switchApiProvider } = useAuth();
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

  // 處理 API 來源切換
  const handleProviderChange = (provider: ApiProvider) => {
    if (provider === apiProvider) return;

    Alert.alert(
      "切換 API 來源",
      "切換將會自動登出目前帳號，因為不同的後端擁有獨立的資料庫。確定要切換嗎？",
      [
        { text: "取消", style: "cancel" },
        { 
          text: "確定切換", 
          style: "destructive",
          onPress: async () => {
            try {
              await switchApiProvider(provider);
              router.replace("/");
            } catch (err) {
              setError("切換 API 失敗");
            }
          }
        }
      ]
    );
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

        {/* API 來源設定區塊 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API 來源設定</Text>
          <Text style={styles.sectionSubtitle}>設定目前連線的後端 API 伺服器：</Text>
          <View style={styles.segmentedControl}>
            <Pressable 
              style={[
                styles.segment, 
                apiProvider === "custom" && styles.segmentActive
              ]} 
              onPress={() => handleProviderChange("custom")}
            >
              <Text style={[
                styles.segmentText, 
                apiProvider === "custom" && styles.segmentTextActive
              ]}>自訂 API (FastAPI)</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.segment, 
                apiProvider === "firebase" && styles.segmentActive
              ]} 
              onPress={() => handleProviderChange("firebase")}
            >
              <Text style={[
                styles.segmentText, 
                apiProvider === "firebase" && styles.segmentTextActive
              ]}>Firebase API</Text>
            </Pressable>
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
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 4,
    gap: 8,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
  },
  segmentedControl: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    flexDirection: "row",
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#2563eb",
  },
});
