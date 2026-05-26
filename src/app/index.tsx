import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { login } from "../api/chat";
import { Screen } from "../components/Screen";
import { commonStyles } from "../components/styles";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <Text style={commonStyles.subtitle}>使用 FastAPI Web API 交換好友與聊天訊息。</Text>
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
});
