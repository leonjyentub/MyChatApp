import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  writeBatch 
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import type { ChatSummary, LoginInput, Message, ProfileInput, RegisterInput, User } from "../types/chat";

// 輔助函式：將使用者名稱對應成 Firebase Auth 所需的虛擬 Email
function getVirtualEmail(username: string): string {
  return `${username.trim().toLowerCase()}@mychatapp.local`;
}

// 註冊帳號
export async function register(input: RegisterInput): Promise<User> {
  const email = getVirtualEmail(input.username);
  
  // 1. 在 Firebase Auth 建立帳號
  const userCredential = await createUserWithEmailAndPassword(auth, email, input.password);
  const uid = userCredential.user.uid;
  const nowStr = new Date().toISOString();

  const newUser: User = {
    id: uid,
    username: input.username.trim(),
    name: input.display_name?.trim() || input.username.trim(),
    birthday: null,
    avatar_url: null,
    created_at: nowStr,
  };

  // 2. 在 Firestore 的 users 集合中建立使用者文件
  await setDoc(doc(db, "users", uid), newUser);

  return newUser;
}

// 登入帳號
export async function login(input: LoginInput): Promise<User> {
  const email = getVirtualEmail(input.username);
  
  // 1. 使用 Firebase Auth 登入
  const userCredential = await signInWithEmailAndPassword(auth, email, input.password);
  const uid = userCredential.user.uid;

  // 2. 從 Firestore 讀取使用者文件
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    // 若 Auth 存在但 Firestore 無文件，補建一個預設文件
    const nowStr = new Date().toISOString();
    const newUser: User = {
      id: uid,
      username: input.username.trim(),
      name: input.username.trim(),
      birthday: null,
      avatar_url: null,
      created_at: nowStr,
    };
    await setDoc(doc(db, "users", uid), newUser);
    return newUser;
  }

  return userDoc.data() as User;
}

// 登出帳號
export async function logout(): Promise<void> {
  await firebaseSignOut(auth);
}

// 更新個人資料
export async function updateProfile(userId: string, input: ProfileInput): Promise<User> {
  const userDocRef = doc(db, "users", userId);
  
  // 1. 更新 Firestore 檔案
  await updateDoc(userDocRef, {
    name: input.name.trim(),
    birthday: input.birthday,
    avatar_url: input.avatar_url,
  });

  // 2. 獲取更新後的最新資料
  const updatedDoc = await getDoc(userDocRef);
  if (!updatedDoc.exists()) {
    throw new Error("找不到使用者檔案");
  }

  return updatedDoc.data() as User;
}

// 取得好友名單
export async function getFriends(userId: string): Promise<User[]> {
  const friendsSnapshot = await getDocs(collection(db, "users", userId, "friends"));
  const friendIds = friendsSnapshot.docs.map(doc => doc.id);

  if (friendIds.length === 0) {
    return [];
  }

  // 批次讀取好友的詳細個人檔案
  const friendsList: User[] = [];
  for (const friendId of friendIds) {
    const friendDoc = await getDoc(doc(db, "users", friendId));
    if (friendDoc.exists()) {
      friendsList.push(friendDoc.data() as User);
    }
  }

  // 依名稱排序好友
  return friendsList.sort((a, b) => a.name.localeCompare(b.name));
}

// 加入好友（雙向好友機制）
export async function addFriend(userId: string, friendId: string): Promise<{ message: string }> {
  if (userId === friendId) {
    throw new Error("不能加自己為好友");
  }

  // 1. 驗證好友 ID 是否存在於 users 中
  const friendDoc = await getDoc(doc(db, "users", friendId));
  if (!friendDoc.exists()) {
    throw new Error("此使用者 ID 不存在");
  }

  // 2. 使用寫入批次 (Write Batch) 確保雙向關係同時成立
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // A 的好友列表加入 B
  const myFriendRef = doc(db, "users", userId, "friends", friendId);
  batch.set(myFriendRef, { added_at: now });

  // B 的好友列表加入 A
  const friendFriendRef = doc(db, "users", friendId, "friends", userId);
  batch.set(friendFriendRef, { added_at: now });

  await batch.commit();

  return { message: "已成功加入好友" };
}

// 輔助函式：計算兩者之間的 1-to-1 聊天室 ID（以字母排序連接，確保唯一）
function getChatId(userA: string, userB: string): string {
  return userA < userB ? `${userA}_${userB}` : `${userB}_${userA}`;
}

// 取得聊天列表
export async function getChats(userId: string): Promise<ChatSummary[]> {
  // 1. 查詢所有包含此使用者的 chats
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId)
  );
  
  const querySnapshot = await getDocs(q);
  const summaries: ChatSummary[] = [];

  for (const docSnapshot of querySnapshot.docs) {
    const chatData = docSnapshot.data();
    const participants = chatData.participants as string[];
    const friendId = participants.find(id => id !== userId);

    if (!friendId) continue;

    // 2. 獲取好友詳細檔案
    const friendDoc = await getDoc(doc(db, "users", friendId));
    if (!friendDoc.exists()) continue;

    summaries.push({
      friend: friendDoc.data() as User,
      last_message: chatData.last_message || null,
      last_time: chatData.last_time || null,
    });
  }

  // 3. 在記憶體中排序聊天列表（降冪排列，最新訊息在最上面），避免 Firestore 複合索引限制而報錯
  return summaries.sort((a, b) => {
    const timeA = a.last_time || "";
    const timeB = b.last_time || "";
    return timeB.localeCompare(timeA);
  });
}

// 取得聊天訊息
export async function getMessages(userId: string, friendId: string): Promise<Message[]> {
  const chatId = getChatId(userId, friendId);
  
  // 查詢對應聊天室下的所有 messages，按建立時間升冪排列
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("created_at", "asc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data() as Message);
}

// 傳送訊息
export async function sendMessage(userId: string, friendId: string, text: string): Promise<Message> {
  const chatId = getChatId(userId, friendId);
  const now = new Date().toISOString();

  // 1. 自動產生訊息文件的參照（即自動產生 ID）
  const messageDocRef = doc(collection(db, "chats", chatId, "messages"));
  
  const newMessage: Message = {
    id: messageDocRef.id,
    sender_id: userId,
    receiver_id: friendId,
    text: text.trim(),
    created_at: now,
  };

  // 2. 在寫入批次中同時寫入「訊息」與更新「聊天室摘要」
  const batch = writeBatch(db);
  
  // 寫入訊息文件
  batch.set(messageDocRef, newMessage);

  // 更新/合併聊天室大文件，用於聊天列表顯示
  const chatRef = doc(db, "chats", chatId);
  batch.set(chatRef, {
    participants: [userId, friendId],
    last_message: newMessage,
    last_time: now,
  }, { merge: true });

  await batch.commit();

  return newMessage;
}
