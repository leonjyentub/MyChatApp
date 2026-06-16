import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { register } from "../api/chat";
import { signInWithGoogleIdToken } from "../api/firebase";
import { Screen } from "../components/Screen";
import { commonStyles } from "../components/styles";
import { useAuth } from "../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const googleClientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

const hasGoogleClientId = Boolean(
  googleClientIds.webClientId ||
    googleClientIds.iosClientId ||
    googleClientIds.androidClientId,
);

export default function RegisterScreen() {
  const { apiProvider, signIn, switchApiProvider } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useIdTokenAuthRequest({
      clientId:
        googleClientIds.webClientId ||
        googleClientIds.iosClientId ||
        googleClientIds.androidClientId ||
        "missing-google-client-id",
      ...googleClientIds,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    });

  useEffect(() => {
    async function completeGoogleSignIn(idToken: string) {
      setError("");
      try {
        if (apiProvider !== "firebase") {
          await switchApiProvider("firebase");
        }

        const user = await signInWithGoogleIdToken(idToken);
        signIn(user);
        router.replace("/friends");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google 登入失敗");
      } finally {
        setGoogleLoading(false);
      }
    }

    if (!googleResponse) return;

    if (googleResponse.type === "success") {
      const idToken = googleResponse.params.id_token;
      if (idToken) {
        completeGoogleSignIn(idToken);
      } else {
        setGoogleLoading(false);
        setError("Google 沒有回傳登入憑證，請確認 OAuth Client ID 與 Firebase 設定。");
      }
      return;
    }

    if (googleResponse.type === "cancel" || googleResponse.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [apiProvider, googleResponse, signIn, switchApiProvider]);

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

  const onGoogleRegister = async () => {
    setError("");

    if (!hasGoogleClientId) {
      setError("尚未設定 Google OAuth Client ID，請先設定 EXPO_PUBLIC_GOOGLE_*_CLIENT_ID。");
      return;
    }

    if (!googleRequest) {
      setError("Google 登入尚未準備完成，請稍後再試。");
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await promptGoogleAsync();
      if (result.type !== "success") {
        setGoogleLoading(false);
      }
    } catch (err) {
      setGoogleLoading(false);
      setError(err instanceof Error ? err.message : "無法開啟 Google 登入");
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
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>或</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable
          style={[
            commonStyles.secondaryButton,
            (!hasGoogleClientId || !googleRequest || googleLoading) &&
              styles.disabledButton,
          ]}
          onPress={onGoogleRegister}
          disabled={googleLoading}
        >
          <Text style={commonStyles.secondaryButtonText}>
            {googleLoading ? "Google 登入中..." : "使用 Google 帳號註冊 / 登入"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.55,
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    backgroundColor: "#e2e8f0",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    gap: 12,
    paddingTop: 24,
  },
});
