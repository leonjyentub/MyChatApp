import { apiRequest } from "./client";
import type { ChatSummary, LoginInput, Message, ProfileInput, RegisterInput, User } from "../types/chat";

export function register(input: RegisterInput) {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function login(input: LoginInput) {
  return apiRequest<User>("/auth/login", {
    method: "POST",
    body: input,
  });
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

export function getChats(userId: string) {
  return apiRequest<ChatSummary[]>(`/users/${userId}/chats`);
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
