import { ApiRequestError, apiRequest } from "./client";
import type { AuthSession, ChatSummary, LoginInput, Message, ProfileInput, RegisterInput, User } from "../types/chat";

export function register(input: RegisterInput) {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function login(input: LoginInput) {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function getUser(userId: string) {
  return apiRequest<User>(`/users/${userId}`);
}

export function updateProfile(userId: string, input: ProfileInput) {
  return apiRequest<User>(`/users/${userId}`, {
    method: "PUT",
    body: input,
  });
}

export function getFriends(userId: string) {
  return apiRequest<User[]>(`/users/${userId}/friends`);
}

export function addFriend(userId: string, friendId: string) {
  return apiRequest<{ message: string }>(`/users/${userId}/friends`, {
    method: "POST",
    body: { friend_id: friendId },
  });
}

export async function getChats(userId: string) {
  try {
    return await apiRequest<ChatSummary[]>(`/users/${userId}/chats`);
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status < 500) {
      throw error;
    }

    const friends = await getFriends(userId);
    return friends.map((friend) => ({
      friend,
      last_message: null,
      last_time: null,
    }));
  }
}

export function getMessages(userId: string, friendId: string) {
  return apiRequest<Message[]>(`/chats/${userId}/${friendId}/messages`);
}

export function sendMessage(userId: string, friendId: string, text: string) {
  return apiRequest<Message>(`/chats/${userId}/${friendId}/messages`, {
    method: "POST",
    body: { sender_id: userId, text },
  });
}
