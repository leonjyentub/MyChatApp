import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ChatSummary,
  LoginInput,
  Message,
  ProfileInput,
  RegisterInput,
  User,
} from "../types/chat";
import * as fastapi from "./fastapi";
import * as firebase from "./firebase";

export type ApiProvider = "custom" | "firebase";

// 預設使用 Firebase；只有使用者明確切換後才改用 FastAPI。
let activeProvider: ApiProvider = "firebase";

export async function loadApiProvider(): Promise<ApiProvider> {
  try {
    const saved = await AsyncStorage.getItem("api_provider");
    if (saved === "custom") {
      activeProvider = "custom";
    } else {
      activeProvider = "firebase";
    }
  } catch (err) {
    console.error("[API Switcher] 讀取 API 設定失敗，使用預設值:", err);
    activeProvider = "firebase";
  }
  return activeProvider;
}

export async function setApiProvider(provider: ApiProvider): Promise<void> {
  try {
    await AsyncStorage.setItem("api_provider", provider);
    activeProvider = provider;
    console.log(`[API Switcher] 已成功切換 API 來源至: ${provider}`);
  } catch (err) {
    console.error("[API Switcher] 儲存 API 設定失敗:", err);
  }
}

export function getActiveProvider(): ApiProvider {
  return activeProvider;
}

// ---------------- 動態分流的 API 介面 ----------------

export function register(input: RegisterInput): Promise<User> {
  return activeProvider === "firebase"
    ? firebase.register(input)
    : fastapi.register(input);
}

export function login(input: LoginInput): Promise<User> {
  return activeProvider === "firebase"
    ? firebase.login(input)
    : fastapi.login(input);
}

export function updateProfile(
  userId: string,
  input: ProfileInput,
): Promise<User> {
  return activeProvider === "firebase"
    ? firebase.updateProfile(userId, input)
    : fastapi.updateProfile(userId, input);
}

export function getFriends(userId: string): Promise<User[]> {
  return activeProvider === "firebase"
    ? firebase.getFriends(userId)
    : fastapi.getFriends(userId);
}

export function addFriend(
  userId: string,
  friendId: string,
): Promise<{ message: string }> {
  return activeProvider === "firebase"
    ? firebase.addFriend(userId, friendId)
    : fastapi.addFriend(userId, friendId);
}

export function getChats(userId: string): Promise<ChatSummary[]> {
  return activeProvider === "firebase"
    ? firebase.getChats(userId)
    : fastapi.getChats(userId);
}

export function getMessages(
  userId: string,
  friendId: string,
): Promise<Message[]> {
  return activeProvider === "firebase"
    ? firebase.getMessages(userId, friendId)
    : fastapi.getMessages(userId, friendId);
}

export function sendMessage(
  userId: string,
  friendId: string,
  text: string,
): Promise<Message> {
  return activeProvider === "firebase"
    ? firebase.sendMessage(userId, friendId, text)
    : fastapi.sendMessage(userId, friendId, text);
}
