import {
    Redirect,
    Stack,
    useFocusEffect,
    useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { getMessages, sendMessage } from "../../api/chat";
import { commonStyles } from "../../components/styles";
import { useAuth } from "../../context/AuthContext";
import type { Message } from "../../types/chat";

const MESSAGE_REFRESH_INTERVAL_MS = 2000;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function areMessagesEqual(current: Message[], next: Message[]) {
  if (current.length !== next.length) return false;
  return current.every((message, index) => {
    const nextMessage = next[index];
    return (
      message.id === nextMessage.id &&
      message.text === nextMessage.text &&
      message.created_at === nextMessage.created_at
    );
  });
}

export default function ChatRoomScreen() {
  const { user } = useAuth();
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const messageListRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!user || !friendId) return;

      let isActive = true;
      let isRefreshing = false;

      const refreshMessages = async (showError: boolean) => {
        if (isRefreshing) return;
        isRefreshing = true;

        try {
          const data = await getMessages(user.id, friendId);
          if (!isActive) return;
          setMessages((current) =>
            areMessagesEqual(current, data) ? current : data,
          );
          setError("");
        } catch (err) {
          if (isActive && showError) {
            setError(err instanceof Error ? err.message : "載入訊息失敗");
          }
        } finally {
          isRefreshing = false;
        }
      };

      refreshMessages(true);
      const intervalId = setInterval(
        () => refreshMessages(false),
        MESSAGE_REFRESH_INTERVAL_MS,
      );

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [friendId, user]),
  );

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() =>
      messageListRef.current?.scrollToEnd({ animated: true }),
    );
  }, [messages]);

  if (!user) {
    return <Redirect href="/" />;
  }

  const onSend = async () => {
    if (!text.trim() || !friendId) return;
    const draft = text.trim();
    setText("");
    setError("");
    try {
      const created = await sendMessage(user.id, friendId, draft);
      setMessages((current) => [...current, created]);
    } catch (err) {
      setText(draft);
      setError(err instanceof Error ? err.message : "傳送失敗");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: `聊天室 ${friendId}` }} />
      {error ? (
        <Text style={[commonStyles.error, styles.error]}>{error}</Text>
      ) : null}
      <FlatList
        ref={messageListRef}
        contentContainerStyle={styles.messages}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user.id;
          return (
            <View style={[styles.bubbleRow, isMine && styles.myBubbleRow]}>
              <View
                style={[
                  styles.bubble,
                  isMine ? styles.myBubble : styles.friendBubble,
                ]}
              >
                <Text
                  style={[styles.messageText, isMine && styles.myMessageText]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[styles.messageTime, isMine && styles.myMessageTime]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputBar}>
        <TextInput
          multiline
          placeholder="輸入訊息"
          style={[commonStyles.input, styles.messageInput]}
          value={text}
          onChangeText={setText}
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <Text style={commonStyles.buttonText}>送出</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 8,
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  container: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  error: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  friendBubble: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  inputBar: {
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  messageInput: {
    flex: 1,
    maxHeight: 120,
  },
  messageText: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  messages: {
    gap: 10,
    padding: 16,
  },
  myBubble: {
    backgroundColor: "#2563eb",
  },
  myBubbleRow: {
    justifyContent: "flex-end",
  },
  myMessageText: {
    color: "#ffffff",
  },
  myMessageTime: {
    color: "#dbeafe",
  },
  sendButton: {
    ...commonStyles.button,
    minWidth: 76,
  },
});
