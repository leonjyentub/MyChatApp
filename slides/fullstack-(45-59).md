# React Native 串接 FastAPI 全端開發教學-4：聊天 App 延伸補充

以之前三份 Full Stack CRUD 投影片內容為基礎，延伸補充聊天 App

## 延伸主題摘要

### 後端
- 聊天 App 領域模型：User、Friendship、Message、ChatSummary
- Pydantic Field 驗證：min_length、max_length、Optional、date
- UUID 產生 ID、UTC ISO 時間戳
- 註冊、登入、個人資料、好友、聊天訊息等非 CRUD 文章 API
- HTTP 401、403、409 與 detail 錯誤訊息
- public_user 回傳資料遮罩，避免把 password 傳給前端
- set[tuple[str, str]] 表示雙向好友關係
- list comprehension、max(key=...)、sorted(key=..., reverse=True)
- seed endpoint 產生課堂測試資料

### 前端
- AuthContext、Provider、useContext、useMemo、客製 useAuth hook
- Expo Router route group：(tabs)、Tabs、Redirect、Stack.Screen options
- useFocusEffect 與 useCallback：畫面重新聚焦時重新載入資料
- apiRequest<T> 泛型 API client、RequestOptions、unknown body、Promise<T>
- expo-constants hostUri 與 Platform.OS 動態推導 API_BASE_URL
- 安全輸入與表單屬性：secureTextEntry、autoCapitalize、multiline
- FlatList 進階屬性：ListEmptyComponent、numberOfLines、contentContainerStyle
- KeyboardAvoidingView、SafeAreaView、Image 頭像與 fallback UI
- 條件渲染、樂觀更新、錯誤恢復與 loading disabled 狀態

---

## Slide 45：從文章 CRUD 延伸到聊天 App

這一階段會延伸成更接近實務情境的聊天系統，因此會加入幾個新能力：
- 使用者註冊與登入
- 登入後才能進入主要畫面
- 好友關係
- 聊天列表與訊息列表
- 個人資料設定
- App 全域狀態管理

這一份延伸投影片的目標，是把「文章 CRUD」升級成「多資料模型、多頁面狀態、多 API 流程」的完整實務 App。

**圖片提示詞：** 教學用全端架構圖，左側是文章 CRUD App，右側升級成聊天 App，顯示 User、Friend、Message、Auth、Tabs、FastAPI，多色清楚資訊圖風格

---

## Slide 46：聊天 App 需要的資料模型

之前的投影片內容以 Post 為主要資料模型：
- id
- title
- body

聊天 App 需要拆成多個資料模型：
- User：使用者資料
- Friendship：兩個使用者之間的好友關係
- Message：一則聊天訊息
- ChatSummary：聊天列表中的摘要資料

學習重點：當 App 功能變多，後端不只是增加 endpoint，而是要先重新思考資料之間的關係。

**圖片提示詞：** 資料模型關係圖，User 與 User 之間有 Friendship，User 發送 Message 給另一個 User，ChatSummary 由 friend 與 last_message 組成，教學簡報風格

---

## Slide 47：User 型別與公開資料

後端使用 user dict 儲存完整資料，其中包含 password。
但回傳給前端時，只能回傳公開欄位。

public_user() 的用途：
- 過濾 password
- 統一 API 回傳格式
- 讓前端 User 型別可以穩定對應後端 JSON

這是從練習作品進入完整實務 App 時非常重要的觀念：資料庫中的資料不等於 API 應該回傳的資料。

```
def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "birthday": user.get("birthday"),
        "avatar_url": user.get("avatar_url"),
        "created_at": user["created_at"],
    }
```

**圖片提示詞：** API 資料遮罩示意圖，左邊完整 user 含 password，右邊 public_user 移除 password 後傳給手機 App，安全教學風格

---

## Slide 48：Pydantic Field 欄位驗證

之前的投影片內容已介紹 BaseModel 與基本型別。
這一階段可以再加入 Field 驗證：
- min_length：最短字數
- max_length：最長字數
- default：預設值
- Optional：欄位可以是 None

FastAPI 會根據 Pydantic Model 自動驗證 request body。
驗證失敗時，後端會回傳 422，前端不用自己檢查所有格式。

延伸閱讀：FastAPI Body Fields、Pydantic Field constraints。

```
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=4, max_length=60)
    display_name: Optional[str] = Field(default=None, max_length=40)
```

**圖片提示詞：** Pydantic Field 驗證流程圖，username 和 password 進入 FastAPI，通過 min_length max_length 檢查後才進入 route function，簡潔教學圖

---

## Slide 49：Optional 與 None 的意義

Optional[str] 代表這個欄位可以是字串，也可以是 None。
在聊天 App 中常見情境：
- display_name 可以不填
- birthday 可以不填
- avatar_url 可以不填

後端使用 Optional，前端則對應成 string | null 或可選欄位。
這能讓學生理解：資料格式不是只有「有值」，也要設計「沒有值」時的行為。

```
display_name: Optional[str] = None

export type User = {
  birthday: string | null;
  avatar_url: string | null;
};
```

**圖片提示詞：** Optional 與 null 對應圖，Python Optional[str] 對到 TypeScript string | null，顯示生日與頭像 URL 可有可無

---

## Slide 50：日期欄位與 ISO 格式

這個聊天 App 的後端會使用 date 與 datetime：
- birthday 使用 date，代表只有年月日
- created_at 使用 datetime，代表精確時間
- timezone.utc 讓時間有明確時區
- isoformat() 轉成前端容易處理的字串

學習重點：前後端交換時間資料時，不建議傳 Python datetime 物件本身，而是傳標準字串格式。

```
from datetime import date, datetime, timezone

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
```

**圖片提示詞：** 時間資料轉換圖，Python datetime UTC 轉 ISO 字串，再到 React Native 顯示成聊天時間，清楚箭頭流程

---

## Slide 51：UUID 產生不重複 ID

之前的文章 CRUD 範例使用 next_id = 1, 2, 3。
聊天 App 改用 uuid4() 產生 ID。

優點：
- 不需要依賴全域遞增數字
- 較不容易和既有資料撞號
- 訊息 ID 可以快速產生

為了讓課堂示範更容易閱讀，使用者 ID 可以縮短成前 8 碼；正式產品通常會保留完整 UUID 或交給資料庫產生。

```
from uuid import uuid4

user_id = uuid4().hex[:8]
message_id = uuid4().hex
```

**圖片提示詞：** UUID ID 產生示意圖，顯示 uuid4 產生長字串，再分配給 User 和 Message，科技感但教學清楚

---

## Slide 52：註冊 API：建立使用者

註冊流程不只是新增一筆資料，還包含商業規則：
1. 檢查 username 是否已存在
2. 已存在就回傳 409 Conflict
3. 建立 id、name、created_at
4. 存進 users list
5. 回傳 public_user

學習重點：POST 不只是 append 資料，也常常包含驗證與資料轉換。

```
@app.post("/auth/register")
def register(payload: RegisterRequest):
    if find_user_by_username(payload.username):
        raise HTTPException(status_code=409, detail="Username already exists")
    ...
    users.append(user)
    return public_user(user)
```

**圖片提示詞：** 註冊 API 流程圖，檢查 username、產生 id、建立 user、隱藏 password、回傳公開資料，教學流程圖

---

## Slide 53：登入 API：驗證帳號密碼

登入 API 的流程：
1. 用 username 找使用者
2. 找不到或密碼錯誤，回傳 401 Unauthorized
3. 驗證成功，回傳 public_user

注意事項：課堂示範版為了簡化流程，password 以明文存在記憶體。
更完整的專案應該使用密碼雜湊，例如 bcrypt，並搭配 token 或 session。

```
@app.post("/auth/login")
def login(payload: LoginRequest):
    user = find_user_by_username(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return public_user(user)
```

**圖片提示詞：** 登入驗證流程圖，username password 進入後端，成功回傳 User，失敗回傳 401，並標示教學版密碼僅為簡化示範

---

## Slide 54：HTTPException 與狀態碼設計

之前的投影片內容已經提到 404。
更完整的聊天 App 會用到更多狀態碼：
- 400：使用者操作不合法，例如加自己為好友
- 401：帳號密碼錯誤
- 403：不是好友，不能讀取訊息
- 404：找不到使用者
- 409：帳號已存在

FastAPI 的 HTTPException 可以中斷目前 request，直接回傳錯誤 response 給前端。
延伸閱讀：FastAPI HTTPException 官方文件。

**圖片提示詞：** HTTP 狀態碼教學表，400 401 403 404 409 對應聊天 App 情境，紅黃藍分色資訊圖

---

## Slide 55：Helper Function 讓 Route 更乾淨

這個聊天 App 會把常用邏輯拆成 helper function：
- find_user()
- find_user_by_username()
- friendship_key()
- ensure_friends()
- message_between()

好處：
- route function 更容易閱讀
- 重複邏輯集中管理
- 錯誤處理更一致

這是從初學 CRUD 進入完整實務 App 的重要一步：讓 API 路由描述流程，讓 helper function 處理細節。

**圖片提示詞：** FastAPI route 與 helper function 分工圖，route 負責 API 流程，helper 負責查找使用者、確認好友、過濾訊息，整潔程式架構圖

---

## Slide 56：好友關係：set 與 tuple

這個聊天 App 可以用 set[tuple[str, str]] 儲存好友關係。
例如 Alice 與 Bob 的好友關係只存一筆：
("alice001", "bob002")

friendship_key() 會先排序兩個 ID，確保：
- Alice 加 Bob
- Bob 加 Alice

都會得到相同 key，避免重複關係。

```
friendships: set[tuple[str, str]] = set()

def friendship_key(user_a: str, user_b: str) -> tuple[str, str]:
    return tuple(sorted([user_a, user_b]))
```

**圖片提示詞：** 雙向好友關係資料結構圖，Alice Bob 兩個方向都變成同一個排序 tuple，存入 set 中避免重複

---

## Slide 57：確保只有好友能聊天

send_message 與 get_messages 都會呼叫 ensure_friends()。
如果兩個使用者不是好友，後端回傳 403。

這是授權規則的簡化版本：
- 誰可以看資料？
- 誰可以送訊息？
- API 要不要相信前端傳來的資料？

學習重點：前端可以隱藏按鈕，但真正的規則必須在後端再次檢查。

```
def ensure_friends(user_a: str, user_b: str) -> None:
    if friendship_key(user_a, user_b) not in friendships:
        raise HTTPException(status_code=403, detail="Users are not friends")
```

**圖片提示詞：** 聊天授權檢查圖，前端要求讀取訊息，後端先確認 friendship set，通過才回傳 messages，不通過回傳 403

---

## Slide 58：List Comprehension 過濾資料

message_between() 使用 list comprehension 從 messages 中挑出兩個使用者之間的訊息。

這個技巧適合補在 Python 基礎之後：
- 從一個 list 產生新 list
- 加上 if 條件過濾
- 讓資料查詢更簡潔

學生可以把它理解成：用一行程式完成 filter + collect。

```
def message_between(user_a: str, user_b: str) -> list[dict]:
    return [
        message
        for message in messages
        if {message["sender_id"], message["receiver_id"]} == {user_a, user_b}
    ]
```

**圖片提示詞：** Python list comprehension 教學圖，messages 列表經過 if 條件過濾後產生兩人聊天訊息列表

---

## Slide 59：聊天列表：max 與 sorted

聊天列表需要知道每位好友的最後一則訊息。
這裡可以使用：
- max(chat_messages, key=lambda item: item["created_at"])
- sorted(chats, key=lambda item: item["last_time"] or "", reverse=True)

學習重點：
- key 參數指定排序或比較依據
- lambda 是短小的一次性函式
- reverse=True 代表新訊息排在前面

**圖片提示詞：** 聊天列表排序示意圖，多個聊天室依照 last_time 從新到舊排列，旁邊標示 max key lambda sorted reverse

---

## 延伸閱讀來源

- FastAPI HTTPException: https://fastapi.tiangolo.com/reference/exceptions/
- FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI Body Fields / Pydantic Field: https://fastapi.tiangolo.com/tutorial/body-fields/
- Pydantic Field constraints: https://docs.pydantic.dev/latest/concepts/fields/
- Expo Router navigation: https://docs.expo.dev/router/basics/navigation/
- Expo Router redirects: https://docs.expo.dev/router/reference/redirects/
- Expo Router API: https://docs.expo.dev/versions/latest/sdk/router/
- Expo Constants: https://docs.expo.dev/versions/latest/sdk/constants/
- React useContext: https://react.dev/reference/react/useContext
- React useMemo: https://react.dev/reference/react/useMemo
- React useCallback: https://react.dev/reference/react/useCallback
- React Native Core Components: https://reactnative.dev/docs/components-and-apis
- React Native KeyboardAvoidingView: https://reactnative.dev/docs/keyboardavoidingview
- MDN Response.ok: https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
- TypeScript Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html
