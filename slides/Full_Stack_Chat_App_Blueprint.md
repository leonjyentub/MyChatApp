---
marp: false
theme: gaia
title: React Native 串接 FastAPI 全端開發教學 4-6：聊天 App 延伸補充與測試除錯
author: 教學團隊
paginate: true
---

# React Native 串接 FastAPI 全端開發教學

### 聊天 App 延伸補充與測試除錯

---

## 投影片概述

- 從文章 CRUD 延伸到聊天 App、資料模型設計、後端 API 實現
- 前端型別系統、API Client、AuthContext、路由設計
- 進階 React 特性、使用者體驗、測試與除錯

---

## 45. 從文章 CRUD 延伸到聊天 App

這一階段會延伸成更接近實務情境的聊天系統，因此會加入幾個新能力：

| 功能 | 功能 |
| --- | --- |
| 使用者註冊與登入 | 聊天列表與訊息列表 |
| 登入後才能進入主要畫面 | 個人資料設定 |
| 好友關係 | App 全域狀態管理 |

這一份延伸投影片的目標，是把「文章 CRUD」升級成「多資料模型、多頁面狀態、多 API 流程」的完整實務 App。

---

## 46. 聊天 App 需要的資料模型

之前的投影片內容以 Post 為主要資料模型：id、title、body

聊天 App 需要拆成多個資料模型：

- **User**：使用者資料
- **Friendship**：兩個使用者之間的好友關係
- **Message**：一則聊天訊息
- **ChatSummary**：聊天列表中的摘要資料

學習重點：當 App 功能變多，後端不只是增加 endpoint，而是要先重新思考資料之間的關係。

---

## 47. User 型別與公開資料

後端使用 user dict 儲存完整資料，其中包含 password。
但回傳給前端時，只能回傳公開欄位。

<div style="display: flex;">
  <div style="flex: 1;">
    <ul>
      <li>過濾 password</li>
      <li>統一 API 回傳格式</li>
      <li>讓前端 User 型別可以穩定對應後端 JSON</li>
    </ul>
  </div>
  <div style="flex: 1;">
    <pre><code>def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "birthday": user.get("birthday"),
        "avatar_url": user.get("avatar_url"),
        "created_at": user["created_at"],
    }</code></pre>
  </div>
</div>

這是從練習作品進入完整實務 App 時非常重要的觀念：資料庫中的資料不等於 API 應該回傳的資料。

---

## 48. Pydantic Field 欄位驗證

之前的投影片內容已介紹 BaseModel 與基本型別。
這一階段可以再加入 Field 驗證：

- `min_length`：最短字數
- `max_length`：最長字數
- `default`：預設值
- `Optional`：欄位可以是 None

FastAPI 會根據 Pydantic Model 自動驗證 request body。驗證失敗時，後端會回傳 422，前端不用自己檢查所有格式。

延伸閱讀：FastAPI Body Fields、Pydantic Field constraints。

---

## 48-2. Pydantic Field (續Code)

之前的投影片內容已介紹 BaseModel 與基本型別。
這一階段可以再加入 Field 驗證：

```python
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=4, max_length=60)
    display_name: Optional[str] = Field(default=None, max_length=40)
```

---

## 49. Optional 與 None 的意義

`Optional[str]` 代表這個欄位可以是字串，也可以是 None。
在聊天 App 中常見情境：

- display_name 可以不填
- birthday 可以不填
- avatar_url 可以不填

後端使用 Optional，前端則對應成 `string | null` 或可選欄位。
這能讓學生理解：資料格式不是只有「有值」，也要設計「沒有值」時的行為。

```python
display_name: Optional[str] = None
```

```typescript
export type User = {
  birthday: string | null;
  avatar_url: string | null;
};
```

---

## 50. 日期欄位與 ISO 格式

這個聊天 App 的後端會使用 date 與 datetime：

- `birthday` 使用 date，代表只有年月日
- `created_at` 使用 datetime，代表精確時間
- `timezone.utc` 讓時間有明確時區
- `isoformat()` 轉成前端容易處理的字串

學習重點：前後端交換時間資料時，不建議傳 Python datetime 物件本身，而是傳標準字串格式。

```python
from datetime import date, datetime, timezone

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
```

---

## 51. UUID 產生不重複 ID

之前的文章 CRUD 範例使用 next_id = 1, 2, 3。
聊天 App 改用 `uuid4()` 產生 ID。

優點：
- 不需要依賴全域遞增數字
- 較不容易和既有資料撞號
- 訊息 ID 可以快速產生

為了讓課堂示範更容易閱讀，使用者 ID 可以縮短成前 8 碼；正式產品通常會保留完整 UUID 或交給資料庫產生。

```python
from uuid import uuid4

user_id = uuid4().hex[:8]
message_id = uuid4().hex
```

---

## 52. 註冊 API：建立使用者

註冊流程不只是新增一筆資料，還包含商業規則：

1. 檢查 username 是否已存在
2. 已存在就回傳 409 Conflict
3. 建立 id、name、created_at
4. 存進 users list
5. 回傳 public_user

```python
@app.post("/auth/register")
def register(payload: RegisterRequest):
    if find_user_by_username(payload.username):
        raise HTTPException(status_code=409, detail="Username already exists")
    ...
    users.append(user)
    return public_user(user)
```

學習重點：POST 不只是 append 資料，也常常包含驗證與資料轉換。

---

## 53. 登入 API：驗證帳號密碼

登入 API 的流程：

1. 用 username 找使用者
2. 找不到或密碼錯誤，回傳 401 Unauthorized
3. 驗證成功，回傳 public_user

注意事項：課堂示範版為了簡化流程，password 以明文存在記憶體。
更完整的專案應該使用密碼雜湊，例如 bcrypt，並搭配 token 或 session。

```python
@app.post("/auth/login")
def login(payload: LoginRequest):
    user = find_user_by_username(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return public_user(user)
```

---

## 54. HTTPException 與狀態碼設計

之前的投影片內容已經提到 404。
更完整的聊天 App 會用到更多狀態碼：

- `400`：使用者操作不合法，例如加自己為好友
- `401`：帳號密碼錯誤
- `403`：不是好友，不能讀取訊息
- `404`：找不到使用者
- `409`：帳號已存在

FastAPI 的 HTTPException 可以中斷目前 request，直接回傳錯誤 response 給前端。

延伸閱讀：FastAPI HTTPException 官方文件。

---

## 55. Helper Function 讓 Route 更乾淨

這個聊天 App 會把常用邏輯拆成 helper function：

- `find_user()`
- `find_user_by_username()`
- `friendship_key()`
- `ensure_friends()`
- `message_between()`

好處：
- route function 更容易閱讀
- 重複邏輯集中管理
- 錯誤處理更一致

這是從初學 CRUD 進入完整實務 App 的重要一步：讓 API 路由描述流程，讓 helper function 處理細節。

---

## 56. 好友關係：set 與 tuple

這個聊天 App 可以用 `set[tuple[str, str]]` 儲存好友關係。
例如 Alice 與 Bob 的好友關係只存一筆：`("alice001", "bob002")`

`friendship_key()` 會先排序兩個 ID，確保：
- Alice 加 Bob
- Bob 加 Alice

都會得到相同 key，避免重複關係。

```python
friendships: set[tuple[str, str]] = set()

def friendship_key(user_a: str, user_b: str) -> tuple[str, str]:
    return tuple(sorted([user_a, user_b]))
```

---

## 57. 確保只有好友能聊天

`send_message` 與 `get_messages` 都會呼叫 `ensure_friends()`。
如果兩個使用者不是好友，後端回傳 403。

這是授權規則的簡化版本：
- 誰可以看資料？
- 誰可以送訊息？
- API 要不要相信前端傳來的資料？

```python
def ensure_friends(user_a: str, user_b: str) -> None:
    if friendship_key(user_a, user_b) not in friendships:
        raise HTTPException(status_code=403, detail="Users are not friends")
```

學習重點：前端可以隱藏按鈕，但真正的規則必須在後端再次檢查。

---

## 58. List Comprehension 過濾資料

`message_between()` 使用 list comprehension 從 messages 中挑出兩個使用者之間的訊息。

這個技巧適合補在 Python 基礎之後：
- 從一個 list 產生新 list
- 加上 if 條件過濾
- 讓資料查詢更簡潔

學生可以把它理解成：用一行程式完成 filter + collect。

```python
def message_between(user_a: str, user_b: str) -> list[dict]:
    return [
        message
        for message in messages
        if {message["sender_id"], message["receiver_id"]} == {user_a, user_b}
    ]
```

---

## 59. 聊天列表：max 與 sorted

聊天列表需要知道每位好友的最後一則訊息。
這裡可以使用：

- `max(chat_messages, key=lambda item: item["created_at"])`
- `sorted(chats, key=lambda item: item["last_time"] or "", reverse=True)`

學習重點：
- `key` 參數指定排序或比較依據
- `lambda` 是短小的一次性函式
- `reverse=True` 代表新訊息排在前面

---

# 第 5 部分：進階設計

---

## 60. Seed Endpoint 建立測試資料

`/dev/seed` 是課堂示範常見技巧。
它可以快速建立：

- Alice 使用者
- Bob 使用者
- Alice 與 Bob 的好友關係
- 一則範例訊息

這能避免每次重啟 server 後都要手動建立測試資料。
注意事項：正式產品要避免把 dev endpoint 開放到正式環境。

---

## 61. CORS 與 allow_credentials 注意事項

之前的投影片內容已提到 CORS middleware。
更完整的 API 設定可以再說明 `allow_credentials=True`。

學習重點：
- CORS 是瀏覽器與 WebView 前端存取不同來源 API 時的重要設定
- `allow_methods` 與 `allow_headers` 控制允許哪些方法與標頭
- 開發教學可暫時使用 `allow_origins=["*"]`
- 若正式使用 credentials，建議改成明確 origin 清單

延伸閱讀：FastAPI CORS 官方文件。

---

## 62. 前端型別升級：User Message ChatSummary

之前的投影片內容使用 Post 型別描述文章。
聊天 App 可以再加入多個 TypeScript type：

- **User**：目前登入者或好友
- **Message**：聊天訊息
- **ChatSummary**：聊天列表摘要
- **RegisterInput / LoginInput / ProfileInput**：表單送出的資料

學習重點：前端型別應該跟 API response 與 request body 對齊。

---

## 63. API Client：集中管理 fetch

之前的投影片內容中，每個 API function 都直接 fetch。
更完整的專案可以加入 `apiRequest()`，集中處理：

- API_BASE_URL
- HTTP method
- JSON headers
- JSON.stringify body
- response.ok 錯誤判斷
- response.json() 解析

```typescript
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {...});
  if (!response.ok) throw new Error(...);
  return response.json();
}
```

這讓 API 呼叫更一致，也讓錯誤處理不用重複寫在每個 function。

---

## 64. TypeScript 泛型 T

`apiRequest<T>` 的 T 代表「呼叫這個 API 預期會回傳什麼型別」。

範例：
- `register()` 預期回傳 User
- `getFriends()` 預期回傳 User[]
- `sendMessage()` 預期回傳 Message

泛型的教學價值：
- API function 更有型別提示
- 呼叫端知道會拿到什麼資料
- 減少把 Message 當成 User 使用的錯誤

```typescript
return apiRequest<User>("/auth/login", {...});
return apiRequest<User[]>(`/users/${userId}/friends`);
return apiRequest<Message>(`/chats/${userId}/${friendId}/messages`, {...});
```

---

## 65. RequestOptions 與 unknown

`RequestOptions` 描述 `apiRequest` 可以接收哪些設定。
`body` 使用 `unknown`，代表「目前還不知道是什麼型別」。

這比 `any` 更適合教學：
- `any` 會關掉型別檢查
- `unknown` 保留安全性
- `apiRequest` 只負責把 body JSON.stringify

學生可把 `RequestOptions` 理解成 fetch 的簡化設定物件。

```typescript
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};
```

---

## 66. response.ok 與錯誤訊息

fetch 不會因為 HTTP 404 或 409 自動進入 catch。
所以前端必須檢查 `response.ok`。

這裡的處理流程：

1. response.ok 為 false
2. 嘗試解析後端 JSON error
3. 取出 detail
4. throw new Error() 交給畫面顯示

延伸閱讀：MDN Response.ok。

---

## 67. 自動推導 API_BASE_URL

之前的投影片內容使用手動設定 IP。
更完整的專案可以使用 expo-constants 與 Platform 自動推導：

- Expo Go 有 hostUri 時，取出開發電腦 IP
- Android 模擬器使用 10.0.2.2
- 其他情境使用 localhost

這能減少課堂中最常見的錯誤：手機連不到電腦上的 FastAPI server。

```typescript
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
if (expoHost) return `http://${expoHost}:8000`;
if (Platform.OS === "android") return "http://10.0.2.2:8000";
return "http://localhost:8000";
```

延伸閱讀：Expo Constants 官方文件。

---

## 68. AuthContext：全域登入狀態

登入後，很多頁面都需要知道目前 user。
如果每一頁都自己傳 props，程式會很難維護。

AuthContext 的用途：
- 儲存目前登入者 user
- 提供 signIn()
- 提供 signOut()
- 提供 setUser() 更新個人資料

延伸閱讀：React useContext 官方文件。

---

## 69. createContext 與 Provider

`createContext` 建立一個全域資料通道。
`Provider` 把 value 提供給底下所有子元件。

這個聊天 App 在 RootLayout 中包住 AuthProvider：
- 登入頁可以 signIn
- Tabs 可以判斷是否登入
- 設定頁可以 setUser
- 登出可以 signOut

```typescript
<AuthProvider>
  <StatusBar style="dark" />
  <Stack>...</Stack>
</AuthProvider>
```

---

## 70. 自訂 useAuth Hook

`useAuth()` 是一個自訂 Hook。
它把 `useContext(AuthContext)` 包裝起來，讓頁面不用直接碰 AuthContext。

另外它也加入保護：
- 如果元件沒有放在 AuthProvider 裡面
- 會直接 throw Error
- 方便開發時快速發現架構錯誤

```typescript
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
```

---

## 71. useMemo 穩定 Context Value

AuthProvider 使用 `useMemo` 包裝 value。
目的不是計算複雜資料，而是讓 context value 的物件參考更穩定。

學習重點：
- React component 每次 render 都會建立新物件
- `useMemo` 可以在 dependencies 沒變時重用結果
- 這能避免不必要的 context value 變動

延伸閱讀：React useMemo 官方文件。

---

## 72. Route Group：(tabs)

`app/(tabs)/` 是 Expo Router 的 route group。
括號資料夾不會出現在網址或 route path 中，但可以用來組織版面。

在這個聊天 App 中的用途：
- 登入後進入 tabs 區域
- friends、chats、settings 共用 Tabs layout
- chat/[friendId] 保留在 Stack 裡，作為聊天室詳細頁

延伸閱讀：Expo Router navigation 官方文件。

---

## 73. Tabs 導航

之前的投影片內容以 Stack 為主。
聊天 App 使用 Tabs 建立主要分頁：

- 好友列表
- 聊天列表
- 個人設定

Tabs 適合長時間停留的主要功能區。
Stack 適合登入、註冊、聊天室詳細頁這類進出式頁面。

```typescript
<Tabs>
  <Tabs.Screen name="friends" options={{ title: "好友列表" }} />
  <Tabs.Screen name="chats" options={{ title: "聊天列表" }} />
  <Tabs.Screen name="settings" options={{ title: "個人設定" }} />
</Tabs>
```

---

## 74. Ionicons 圖示套件

這個聊天 App 使用 @expo/vector-icons 的 Ionicons。
圖示讓 Tab 導航更容易辨識。

學習重點：
- `tabBarIcon` 是一個函式
- Expo Router 會傳入 `color` 與 `size`
- 依照目前是否選取，自動套用 active tint color

```typescript
tabBarIcon: ({ color, size }) => (
  <Ionicons name="people-outline" color={color} size={size} />
)
```

---

# 第 6 部分：測試除錯

---

## 75. Redirect：保護登入後頁面

TabsLayout 會先檢查 user。
如果沒有登入，就回到首頁。

這是前端路由保護：
- 未登入不能看到好友列表
- 未登入不能看到聊天列表
- 未登入不能進設定頁

注意事項：前端 Redirect 提升使用者體驗，但後端仍要做資料權限檢查。

```typescript
if (!user) {
  return <Redirect href="/" />;
}
```

延伸閱讀：Expo Router Redirect 官方文件。

---

## 76. useFocusEffect：畫面回來時重新載入

之前的投影片內容使用 useEffect 載入資料。
聊天 App 可以使用 `useFocusEffect`，讓畫面每次重新聚焦時都能重新讀取。

適合情境：
- 從聊天室回到聊天列表，要更新最後一則訊息
- 新增好友後回到好友列表，要看到最新好友
- Tab 切換回來時重新 fetch

Expo Router 文件建議 callback 搭配 `useCallback`，避免 effect 過度執行。

---

## 77. useCallback：穩定函式依賴

`useFocusEffect` 內的 callback 需要穩定。
因此可以把 `loadFriends` 與 `loadMessages` 包成 `useCallback`。

學習重點：
- `useCallback` 會在 dependencies 沒變時重用同一個函式
- dependencies 改變時才建立新函式
- 常用於 effect、focus effect、傳給子元件的 handler

```typescript
const loadMessages = useCallback(async () => {
  if (!user || !friendId) return;
  const data = await getMessages(user.id, friendId);
  setMessages(data);
}, [friendId, user]);
```

延伸閱讀：React useCallback 官方文件。

---

## 78. Link asChild 與 Pressable

Login 頁用 `Link href="/register" asChild` 包住 Pressable。
這樣可以同時得到：

- Expo Router 的連結導航
- React Native Pressable 的按壓樣式與互動

Expo Router 文件說明：Link 預設會把內容放在 Text 內；若要完整控制按鈕外觀，可使用 asChild。

```typescript
<Link href="/register" asChild>
  <Pressable style={commonStyles.secondaryButton}>
    <Text>建立新帳號</Text>
  </Pressable>
</Link>
```

---

## 79. 表單輸入的實務屬性

聊天 App 的 TextInput 可以加入幾個實務屬性：

- `autoCapitalize="none"`：帳號、URL 不自動大寫
- `secureTextEntry`：密碼輸入隱藏文字
- `multiline`：聊天訊息可輸入多行
- `placeholder`：提示欄位用途

這些不是資料邏輯，但會大幅影響 App 的使用體驗。

---

## 80. FlatList 進階顯示技巧

聊天 App 的列表比文章列表更完整。
這裡可以使用：

- `ListEmptyComponent`：沒有好友或沒有聊天時顯示空狀態
- `contentContainerStyle`：設定列表內距與 gap
- `numberOfLines={1}`：聊天摘要只顯示一行
- `keyExtractor`：用穩定 id 當 key

學習重點：列表不只是 renderItem，也要設計空資料與文字太長時的畫面。

---

## 81. UserAvatar：圖片與 fallback UI

UserAvatar 元件會依照是否有 avatar_url 決定顯示方式：

- 有 uri：使用 Image 顯示遠端圖片
- 沒有 uri：用姓名第一個字母產生 fallback 頭像

這是元件化思維：
- 把重複 UI 包成可重用元件
- 用 props 控制 name、uri、size
- 讓好友列表、聊天列表、設定頁都能共用

---

## 82. KeyboardAvoidingView：聊天輸入列

聊天室底部有輸入框。
手機鍵盤彈出時，輸入框不能被蓋住。

聊天室畫面可以使用 KeyboardAvoidingView：
- iOS 使用 `behavior="padding"`
- Android 先使用 `undefined`，避免平台行為差異造成版面問題
- inputBar 固定在畫面底部

延伸閱讀：React Native KeyboardAvoidingView 官方文件。

---

## 83. 送出訊息：樂觀更新與錯誤恢復

onSend 的流程：

1. trim 清除前後空白
2. 先清空輸入框
3. 呼叫 sendMessage API
4. 成功後把 created message 加到 messages
5. 失敗時把 draft 放回輸入框

這比單純重新 fetch 更有互動感，也讓學生理解使用者體驗與錯誤處理要一起設計。

```typescript
const draft = text.trim();
setText("");
try {
  const created = await sendMessage(user.id, friendId, draft);
  setMessages((current) => [...current, created]);
} catch (err) {
  setText(draft);
}
```

---

## 84. 延伸課程實作任務

請學生以文章 CRUD 的基礎，完成聊天 App 的延伸功能：

- 建立 User、Friendship、Message 資料模型
- 完成 register / login API
- 完成好友新增與好友列表
- 完成聊天列表與訊息收發
- 使用 AuthContext 管理登入狀態
- 使用 Tabs 建立主要頁面
- 使用 useFocusEffect 讓頁面回來時更新資料
- 設計錯誤訊息與空列表狀態

最後討論：目前使用記憶體假資料庫與明文密碼，下一階段可延伸到 SQLite、真正資料庫、密碼雜湊與 JWT。

---

# 參考資源

## 後端（FastAPI）
- FastAPI HTTPException: https://fastapi.tiangolo.com/reference/exceptions/
- FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI Body Fields: https://fastapi.tiangolo.com/tutorial/body-fields/
- Pydantic Field constraints: https://docs.pydantic.dev/latest/concepts/fields/

## 前端（React Native & Expo）
- Expo Router navigation: https://docs.expo.dev/router/basics/navigation/
- Expo Router redirects: https://docs.expo.dev/router/reference/redirects/
- Expo Router API: https://docs.expo.dev/versions/latest/sdk/router/
- Expo Constants: https://docs.expo.dev/versions/latest/sdk/constants/
- React useContext: https://react.dev/reference/react/useContext
- React useMemo: https://react.dev/reference/react/useMemo
- React useCallback: https://react.dev/reference/react/useCallback
- React Native Core Components: https://reactnative.dev/docs/components-and-apis
- React Native KeyboardAvoidingView: https://reactnative.dev/docs/keyboardavoidingview

## 工具與標準
- MDN Response.ok: https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
- TypeScript Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html

---

# 課程總結

這份整合簡報涵蓋從文章 CRUD 升級到完整聊天應用的完整過程：

**第一部分** 建立了後端基礎，包括資料模型、用戶認證、授權規則和資料查詢。

**第二部分** 設計了前端架構，包括 API 客戶端、全域狀態管理、路由設計和導航。

**第三部分** 教授了進階技巧和最佳實踐，包括使用者體驗、錯誤處理和完整的實現細節。

---