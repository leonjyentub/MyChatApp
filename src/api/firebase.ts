import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword, 
  signInWithCredential,
  signOut as firebaseSignOut,
  type Unsubscribe,
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

function getFirebaseErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code)
    : undefined;
}

function toFriendlyFirebaseError(err: unknown, fallback: string): Error {
  const code = getFirebaseErrorCode(err);

  switch (code) {
    case "auth/email-already-in-use":
      return new Error("這個帳號已經被註冊，請改用登入或換一個帳號。");
    case "auth/account-exists-with-different-credential":
      return new Error("這個 Google 信箱已經使用其他登入方式註冊。");
    case "auth/invalid-email":
      return new Error("帳號格式不正確，請只使用英文字母、數字、底線、句點或連字號。");
    case "auth/invalid-id-token":
      return new Error("Google 登入憑證無效，請重新嘗試。");
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return new Error("帳號或密碼不正確。");
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return new Error("Firebase 尚未啟用 Email/Password 登入，請到 Firebase Console 的 Authentication 啟用。");
    case "auth/weak-password":
      return new Error("密碼至少需要 6 個字元。");
    case "permission-denied":
      return new Error("Firestore 權限不足，請檢查 Firebase Security Rules。");
    case undefined:
      return err instanceof Error ? err : new Error(fallback);
    default:
      return new Error(`${fallback}（${code}）`);
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateAuthInput(input: LoginInput | RegisterInput) {
  const username = normalizeUsername(input.username);

  if (!username) {
    throw new Error("請輸入帳號。");
  }

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("帳號需為 3 到 32 個字元，且只能使用英文字母、數字、底線、句點或連字號。");
  }

  if (input.password.length < 6) {
    throw new Error("密碼至少需要 6 個字元。");
  }

  return username;
}

// 輔助函式：將使用者名稱對應成 Firebase Auth 所需的虛擬 Email
function getVirtualEmail(username: string): string {
  return `${normalizeUsername(username)}@mychatapp.local`;
}

function usernameFromEmail(email: string | null): string {
  return email?.replace(/@mychatapp\.local$/, "").split("@")[0] || "user";
}

async function ensureUserProfile(
  uid: string,
  username: string,
  profile?: Partial<Pick<User, "name" | "avatar_url">>,
): Promise<User> {
  const userDocRef = doc(db, "users", uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  const nowStr = new Date().toISOString();
  const newUser: User = {
    id: uid,
    username,
    name: profile?.name?.trim() || username,
    birthday: null,
    avatar_url: profile?.avatar_url || null,
    created_at: nowStr,
  };

  await setDoc(userDocRef, newUser);
  return newUser;
}

export function subscribeToAuthState(
  onUser: (user: User | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          onUser(null);
          return;
        }

        const username = usernameFromEmail(firebaseUser.email);
        const user = await ensureUserProfile(firebaseUser.uid, username, {
          name: firebaseUser.displayName || undefined,
          avatar_url: firebaseUser.photoURL || undefined,
        });
        onUser(user);
      } catch (err) {
        onError(err instanceof Error ? err : new Error("讀取 Firebase 登入狀態失敗"));
      }
    },
    onError,
  );
}

// 註冊帳號
export async function register(input: RegisterInput): Promise<User> {
  const username = validateAuthInput(input);
  const email = getVirtualEmail(username);

  try {
    // 1. 在 Firebase Auth 建立帳號
    const userCredential = await createUserWithEmailAndPassword(auth, email, input.password);
    const uid = userCredential.user.uid;
    const nowStr = new Date().toISOString();

    const newUser: User = {
      id: uid,
      username,
      name: input.display_name?.trim() || username,
      birthday: null,
      avatar_url: null,
      created_at: nowStr,
    };

    // 2. 在 Firestore 的 users 集合中建立使用者文件
    await setDoc(doc(db, "users", uid), newUser);

    return newUser;
  } catch (err) {
    throw toFriendlyFirebaseError(err, "註冊失敗");
  }
}

// 登入帳號
export async function login(input: LoginInput): Promise<User> {
  const username = validateAuthInput(input);
  const email = getVirtualEmail(username);

  try {
    // 1. 使用 Firebase Auth 登入
    const userCredential = await signInWithEmailAndPassword(auth, email, input.password);
    return ensureUserProfile(userCredential.user.uid, username);
  } catch (err) {
    throw toFriendlyFirebaseError(err, "登入失敗");
  }
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    return ensureUserProfile(firebaseUser.uid, usernameFromEmail(firebaseUser.email), {
      name: firebaseUser.displayName || undefined,
      avatar_url: firebaseUser.photoURL || undefined,
    });
  } catch (err) {
    throw toFriendlyFirebaseError(err, "Google 登入失敗");
  }
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
