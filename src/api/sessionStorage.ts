import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession } from "../types/chat";

const SESSION_KEY = "mychat.auth.session";

function getWebStorage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export async function getStoredSession(): Promise<AuthSession | null> {
  try {
    const value =
      Platform.OS === "web"
        ? getWebStorage()?.getItem(SESSION_KEY) ?? null
        : await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;

    const session = JSON.parse(value) as Partial<AuthSession>;
    if (!session.access_token || !session.user?.id) {
      await clearStoredSession();
      return null;
    }
    return session as AuthSession;
  } catch {
    try {
      await clearStoredSession();
    } catch {
      // The storage provider itself may be unavailable (for example, blocked web storage).
    }
    return null;
  }
}

export async function storeSession(session: AuthSession) {
  const value = JSON.stringify(session);
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function clearStoredSession() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getAccessToken() {
  return (await getStoredSession())?.access_token ?? null;
}
