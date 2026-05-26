import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { register } from "../api/chat";
import { Screen } from "../components/Screen";
import { commonStyles } from "../components/styles";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const user = await register({
        username,
        password,
        display_name: displayName || undefined,
      });
      signIn(user);
      router.replace("/friends");
    } catch (err) {
      setError(err instanceof Error ? err.message : "註冊失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.form}>
        <Text style={commonStyles.title}>註冊帳號</Text>
        <Text style={commonStyles.subtitle}>送出後後端會產生一組使用者 ID，之後可用這組 ID 加好友。</Text>
        <TextInput autoCapitalize="none" placeholder="帳號" style={commonStyles.input} value={username} onChangeText={setUsername} />
        <TextInput placeholder="顯示名稱" style={commonStyles.input} value={displayName} onChangeText={setDisplayName} />
        <TextInput placeholder="密碼" secureTextEntry style={commonStyles.input} value={password} onChangeText={setPassword} />
        {error ? <Text style={commonStyles.error}>{error}</Text> : null}
        <Pressable style={commonStyles.button} onPress={onRegister} disabled={loading}>
          <Text style={commonStyles.buttonText}>{loading ? "建立中..." : "註冊並登入"}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingTop: 24,
  },
});
