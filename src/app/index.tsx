import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiProvider, login } from "../api/chat";
import { Screen } from "../components/Screen";
import { commonStyles } from "../components/styles";
import { useAuth } from "../context/AuthContext";

const providerOptions: Array<{
  label: string;
  value: ApiProvider;
}> = [
  { label: "Firebase", value: "firebase" },
  { label: "FastAPI", value: "custom" },
];

export default function LoginScreen() {
  const { apiProvider, signIn, switchApiProvider } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);

  const onProviderChange = async (provider: ApiProvider) => {
    if (provider === apiProvider || switchingProvider || loading) return;

    setError("");
    setSwitchingProvider(true);
    try {
      await switchApiProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "切換後端失敗");
    } finally {
      setSwitchingProvider(false);
    }
  };

  const onLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await login({ username, password });
      signIn(user);
      router.replace("/friends");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={commonStyles.title}>教學聊天 App</Text>
        <Text style={commonStyles.subtitle}>選擇後端後登入，好友與聊天資料會依後端分開保存。</Text>
        <View style={styles.providerBox}>
          <Text style={styles.providerLabel}>後端伺服器</Text>
          <View style={styles.segmentedControl}>
            {providerOptions.map((option) => {
              const isActive = apiProvider === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.segment,
                    isActive && styles.segmentActive,
                    (switchingProvider || loading) && styles.segmentDisabled,
                  ]}
                  onPress={() => onProviderChange(option.value)}
                  disabled={switchingProvider || loading}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.providerHint}>
            目前使用：{apiProvider === "firebase" ? "Firebase" : "FastAPI"}
          </Text>
        </View>
        <TextInput
          autoCapitalize="none"
          placeholder="帳號"
          style={commonStyles.input}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          placeholder="密碼"
          secureTextEntry
          style={commonStyles.input}
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={commonStyles.error}>{error}</Text> : null}
        <Pressable style={commonStyles.button} onPress={onLogin} disabled={loading}>
          <Text style={commonStyles.buttonText}>{loading ? "登入中..." : "登入"}</Text>
        </Pressable>
        <Link href="/register" asChild>
          <Pressable style={commonStyles.secondaryButton}>
            <Text style={commonStyles.secondaryButtonText}>建立新帳號</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  providerBox: {
    gap: 8,
    marginBottom: 4,
  },
  providerHint: {
    color: "#64748b",
    fontSize: 12,
  },
  providerLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentDisabled: {
    opacity: 0.6,
  },
  segmentedControl: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    flexDirection: "row",
    padding: 4,
  },
  segmentText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#2563eb",
  },
});
