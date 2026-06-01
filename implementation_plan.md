# 整合 Firebase 身份驗證與留言功能（支援動態切換 API 來源）

此規劃案說明如何為 React Native Expo 應用程式（MyChatApp）整合 **Firebase 身份驗證 (Authentication)** 與 **Firestore 資料庫留言/聊天功能**，並在「個人設定」頁面中提供一個動態切換開關，讓使用者可以在 **「自訂 API (FastAPI 後端)」** 與 **「Firebase 雲端服務」** 之間自由切換。

---

## 📌 核心設計方案

### 1. 雙後端抽象層 (API Provider Switcher)
為了讓前端 UI 畫面（如登入、註冊、好友、聊天室）完全不受 API 來源切換的影響，我們將採用**策略模式 (Strategy Pattern)**。
- 將現有的 FastAPI API 請求移至 `src/api/fastapi.ts`。
- 新增 Firebase 的實作於 `src/api/firebase.ts`。
- `src/api/chat.ts` 將作為統一入口，根據使用者的選擇（儲存在 `AsyncStorage` 中），動態將請求分流給 FastAPI 或 Firebase。
- **好處**：現有的 `index.tsx`、`register.tsx`、`chats.tsx`、`[friendId].tsx` 等前端 UI 程式碼**完全不需要修改**任何資料載入邏輯！

### 2. 帳號與資料庫對應 (Firebase Mapping)
- **身份驗證 (Firebase Auth)**：
  - 現有的註冊/登入僅需要「帳號 (username)」與「密碼 (password)」。
  - 由於 Firebase Auth 需要電子郵件格式，我們將在後台自動將 `username` 對應為虛擬 Email：`${username}@mychatapp.local`。這能保持 UI 一致性，使用者依然只需輸入帳號與密碼。
- **資料庫 (Cloud Firestore Schema)**：
  - `users` 集合：儲存個人檔案（`id` 即 `uid`、`username`、`name`、`avatar_url`、`birthday`、`created_at`）。
  - `users/{userId}/friends/{friendId}` 子集合：儲存好友名單，當 A 加 B 時，會同時在雙方的好友子集合中建立對應，實現雙向好友關係。
  - `chats` 集合：
    - 文件 ID：`userIdA_userIdB`（將兩個使用者的 ID 排序後用底線連接，確保唯一性）。
    - 欄位：`participants: [userIdA, userIdB]`、`last_message`、`last_time`。
  - `chats/{chatId}/messages` 子集合：儲存聊天訊息，包含 `id`、`sender_id`、`receiver_id`、`text`、`created_at`。

### 3. 切換機制安全設計
> [!WARNING]
> 由於 FastAPI 與 Firebase 的使用者資料庫是完全獨立的，當使用者在設定中切換 API 來源時，**系統會自動將當前使用者登出並引導回登入頁面**。這能防止狀態混亂或資料錯亂。

---

## 🛠️ Firebase 後端服務建立指南

若要使用 Firebase，您需要先建立後端服務。以下是詳細的建立步驟：

### 第一步：建立 Firebase 專案
1. 前往 [Firebase Console](https://console.firebase.google.com/)。
2. 點擊 **"新增專案" (Add project)**。
3. 輸入專案名稱（例如：`MyChatApp`），然後點擊 **"繼續"**。
4. 選擇是否啟用 Google Analytics（若為教學/測試，可關閉），然後點擊 **"建立專案"**。

### 第二步：啟用身份驗證 (Authentication)
1. 在左側選單中，點擊 **"建置" (Build) > "Authentication"**。
2. 點擊 **"開始使用" (Get started)**。
3. 在 **"登入方法" (Sign-in method)** 標籤頁中，選擇 **"電子郵件/密碼" (Email/Password)**。
4. 啟用 **"電子郵件/密碼"**，並點擊 **"儲存"**。

### 第三步：啟用 Cloud Firestore 資料庫
1. 在左側選單中，點擊 **"建置" (Build) > "Firestore Database"**。
2. 點擊 **"建立資料庫" (Create database)**。
3. 選擇資料庫位置（通常選擇靠近您的區域，如 `asia-east1`），點擊 **"下一步"**。
4. 選擇 **"以測試模式啟動" (Start in test mode)**（方便開發測試，正式上線時請設定安全規則），點擊 **"建立"**。

> [!TIP]
> **建議的開發用 Firestore 安全規則**：
> ```javascript
> rules_version = '2';
> service cloud.firestore {
>   match /databases/{database}/documents {
>     match /{document=**} {
>       allow read, write: if request.auth != null;
>     }
>   }
> }
> ```

### 第四步：新增 Web 應用程式並取得金鑰
1. 回到專案首頁，點擊網頁圖示 `</>` (Web) 新增一個應用程式。
2. 輸入應用程式暱稱（例如：`Expo App`），點擊 **"註冊應用程式"**。
3. 複製畫面上的 `firebaseConfig` 物件，它看起來會像這樣：
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-app",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456:web:abcd"
   };
   ```
4. 我們會將此設定填入專案的 `src/api/firebaseConfig.ts` 中。

---

## 📦 建議安裝的 npm 套件

在 Expo v56 環境下，為了相容於 **Expo Go**，最方便且通用的做法是使用 **Firebase JS SDK**。我們還需要安裝 `AsyncStorage` 來讓 Firebase Auth 在 App 重啟時仍能保持登入狀態。

在終端機中執行：
```bash
npx expo install firebase @react-native-async-storage/async-storage
```

---

## 📝 預計修改與新增的檔案

以下是本次實作會修改到的檔案清單與變更說明：

```mermaid
graph TD
    UI_Settings[settings.tsx Settings Screen] -->|1. 切換 API 來源| Context[AuthContext.tsx]
    Context -->|2. 保存設定於記憶體與 AsyncStorage| API_Router[chat.ts API Switcher]
    API_Router -->|分流 A| API_FastAPI[fastapi.ts FastAPI API]
    API_Router -->|分流 B| API_Firebase[firebase.ts Firebase API]
    API_Firebase -->|初始化與連線| Config_Firebase[firebaseConfig.ts Firebase SDK]
```

---

### 1. 新增：[firebaseConfig.ts](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/api/firebaseConfig.ts) [NEW]
- **職責**：初始化 Firebase App，並結合 `@react-native-async-storage/async-storage` 建立具備**持久化保存**功能的 Firebase Auth 與 Firestore 實體。
- **主要程式碼結構**：
  ```typescript
  import { initializeApp } from "firebase/app";
  import { initializeAuth, getReactNativePersistence } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";
  import AsyncStorage from "@react-native-async-storage/async-storage";

  const firebaseConfig = {
    apiKey: "AIzaSyAma-2_MtIATF-jKlx1E4yNHfhz3PpmXsA",
    authDomain: "mychatapp-b37e4.firebaseapp.com",
    projectId: "mychatapp-b37e4",
    storageBucket: "mychatapp-b37e4.firebasestorage.app",
    messagingSenderId: "579069137176",
    appId: "1:579069137176:web:ea4d9899476ba839570e6d",
    measurementId: "G-WB9F1LKN7D"
  };

  const app = initializeApp(firebaseConfig);
  
  // 核心：使用 AsyncStorage 讓 Firebase 記住登入狀態，解決重啟 App 會登出的問題
  export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  export const db = getFirestore(app);
  ```

### 2. 新增：[fastapi.ts](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/api/fastapi.ts) [NEW]
- **職責**：承接原先 `src/api/chat.ts` 的所有 FastAPI Fetch 請求邏輯（無痛搬移）。

### 3. 新增：[firebase.ts](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/api/firebase.ts) [NEW]
- **職責**：使用 Firebase JS SDK（`firebase/auth` 與 `firebase/firestore`）實作所有與 FastAPI 對應的接口，確保回傳的資料結構符合 TypeScript 的 `User`、`Message`、`ChatSummary` 等型別。
- **關鍵功能實作**：
  - 註冊時，在 `users` 集合中寫入使用者文件。
  - 傳送訊息時，同時更新訊息子集合與父級 `chats` 文件的 `last_message`，保證聊天列表的即時更新。
  - 好友新增時，使用寫入批次 (Write Batch) 確保雙向好友關係同時成立。

### 4. 修改：[chat.ts](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/api/chat.ts) [MODIFY]
- **職責**：將其轉化為 **API Switcher (分流器)**。
- 讀取當前儲存的 `api_provider` ("custom" 或 "firebase")，並動態呼叫 `fastapi.ts` 或 `firebase.ts` 的對應函式。
- 提供 `loadApiProvider()`、`setApiProvider()` 與 `getActiveProvider()` 等輔助函式。

### 5. 修改：[AuthContext.tsx](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/context/AuthContext.tsx) [MODIFY]
- **職責**：
  - 新增 `apiProvider` ("custom" | "firebase") 狀態。
  - 新增 `switchApiProvider` 函式。
  - 在 App 啟氣時先讀取 `AsyncStorage` 中的 API 來源設定，並初始化 `chat.ts` 中的 activeProvider。
  - 當切換 API 來源時，清除當前登入狀態 (`setUser(null)`)，以利安全切換。

### 6. 修改：[settings.tsx](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/app/(tabs)/settings.tsx) [MODIFY]
- **職責**：在畫面上新增一個「API 來源設定」區塊（Segmented Control 質感按鈕），讓使用者自由選擇自訂 API 還是 Firebase。
- 切換時彈出確認提示，點擊後觸發 `switchApiProvider`，清除登入狀態並跳轉回登入首頁。

### 7. 修改：[_layout.tsx](file:///Users/leonjye/Documents/RNProjects/MyChatApp/src/app/_layout.tsx) [MODIFY]
- **職責**：在 App 初始化載入期間，確保 `AuthContext` 已成功加載 AsyncStorage 中的 API 來源，避免因非同步載入造成初始 API 呼叫錯誤。

---

## 🧪 驗證與測試計畫

### 第一階段：Firebase Env 確認
1. 在模擬器/實機上安裝套件：`npx expo install firebase @react-native-async-storage/async-storage`。
2. 填入您的 Firebase 設定金鑰至 `src/api/firebaseConfig.ts`。

### 第二階段：功能驗證
- **自訂 API 模式測試**：
  - 在「個人設定」中確保目前為「自訂 API」。
  - 測試登入、註冊、讀取好友、傳送聊天訊息，確認與您原先的 FastAPI 後端完全同步。
- **Firebase API 模式測試**：
  - 在「個人設定」中將 API 來源切換至「Firebase API」，App 會自動登出。
  - **註冊測試**：註冊一個新帳號，確認 Firebase Console 的 Authentication 出現了該帳號（Email 格式為 `${username}@mychatapp.local`），且 Firestore 的 `users` 集合成功建立了該使用者的檔案。
  - **好友測試**：登入兩個不同的 Firebase 帳號，互加好友，確認 Firestore 內 `users/{userId}/friends` 順利建立。
  - **聊天測試**：在聊天室中互傳訊息，確認 Firestore 內 `chats/{chatId}/messages` 出現訊息文件，且聊天列表 (Chats Tab) 能正確顯示「最後一條訊息」與「時間」。
- **持久化測試**：
  - 登入 Firebase 帳號後，關閉 App 並重新打開，驗證是否仍保持登入狀態（沒有被登出）。
