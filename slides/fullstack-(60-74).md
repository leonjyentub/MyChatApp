# React Native 串接 FastAPI 全端開發教學-5：進階設計

延伸補充聊天 App 需要使用的語法、函式、關鍵字、技巧與套件。

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

## Slide 60：Seed Endpoint 建立測試資料

/dev/seed 是課堂示範常見技巧。
它可以快速建立：
- Alice 使用者
- Bob 使用者
- Alice 與 Bob 的好友關係
- 一則範例訊息

這能避免每次重啟 server 後都要手動建立測試資料。
注意事項：正式產品要避免把 dev endpoint 開放到正式環境。

**圖片提示詞：** Dev seed endpoint 示意圖，一個按鈕建立 Alice、Bob、Friendship、Sample Message，並標示只適合開發教學環境

---

## Slide 61：CORS 與 allow_credentials 注意事項

之前的投影片內容已提到 CORS middleware。
更完整的 API 設定可以再說明 allow_credentials=True。

學習重點：
- CORS 是瀏覽器與 WebView 前端存取不同來源 API 時的重要設定
- allow_methods 與 allow_headers 控制允許哪些方法與標頭
- 開發教學可暫時使用 allow_origins=["*"]
- 若正式使用 credentials，建議改成明確 origin 清單

延伸閱讀：FastAPI CORS 官方文件。

**圖片提示詞：** CORS 設定風險對照圖，開發環境允許星號，正式環境使用明確 origin 清單，顯示 React Native 與 FastAPI 連線

---

## Slide 62：前端型別升級：User Message ChatSummary

之前的投影片內容使用 Post 型別描述文章。
聊天 App 可以再加入多個 TypeScript type：
- User：目前登入者或好友
- Message：聊天訊息
- ChatSummary：聊天列表摘要
- RegisterInput / LoginInput / ProfileInput：表單送出的資料

學習重點：前端型別應該跟 API response 與 request body 對齊。

**圖片提示詞：** TypeScript 型別與 FastAPI JSON 對應圖，User Message ChatSummary RegisterInput LoginInput ProfileInput 分別對應不同 API

---

## Slide 63：API Client：集中管理 fetch

之前的投影片內容中，每個 API function 都直接 fetch。
更完整的專案可以加入 apiRequest()，集中處理：
- API_BASE_URL
- HTTP method
- JSON headers
- JSON.stringify body
- response.ok 錯誤判斷
- response.json() 解析

這讓 API 呼叫更一致，也讓錯誤處理不用重複寫在每個 function。

```
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {...});
  if (!response.ok) throw new Error(...);
  return response.json();
}
```

**圖片提示詞：** API client 集中封裝圖，多個前端功能 register login getFriends sendMessage 都通過 apiRequest 再連到 FastAPI

---

## Slide 64：TypeScript 泛型 T

apiRequest<T> 的 T 代表「呼叫這個 API 預期會回傳什麼型別」。

範例：
- register() 預期回傳 User
- getFriends() 預期回傳 User[]
- sendMessage() 預期回傳 Message

泛型的教學價值：
- API function 更有型別提示
- 呼叫端知道會拿到什麼資料
- 減少把 Message 當成 User 使用的錯誤

```
return apiRequest<User>("/auth/login", {...});
return apiRequest<User[]>(`/users/${userId}/friends`);
return apiRequest<Message>(`/chats/${userId}/${friendId}/messages`, {...});
```

**圖片提示詞：** TypeScript 泛型 T 教學圖，apiRequest<T> 像一個模板，依不同 API 套入 User、User array、Message

---

## Slide 65：RequestOptions 與 unknown

RequestOptions 描述 apiRequest 可以接收哪些設定。
body 使用 unknown，代表「目前還不知道是什麼型別」。

這比 any 更適合教學：
- any 會關掉型別檢查
- unknown 保留安全性
- apiRequest 只負責把 body JSON.stringify

學生可把 RequestOptions 理解成 fetch 的簡化設定物件。

```
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};
```

**圖片提示詞：** RequestOptions 型別圖，method 限定四種 HTTP 字串，body 是 unknown，進入 apiRequest 後變成 JSON body

---

## Slide 66：response.ok 與錯誤訊息

fetch 不會因為 HTTP 404 或 409 自動進入 catch。
所以前端必須檢查 response.ok。

這裡的處理流程：
1. response.ok 為 false
2. 嘗試解析後端 JSON error
3. 取出 detail
4. throw new Error() 交給畫面顯示

延伸閱讀：MDN Response.ok。

**圖片提示詞：** fetch 錯誤處理流程圖，HTTP response 先檢查 ok，false 時解析 detail 並 throw Error，true 時解析 JSON

---

## Slide 67：自動推導 API_BASE_URL

之前的投影片內容使用手動設定 IP。
更完整的專案可以使用 expo-constants 與 Platform 自動推導：
- Expo Go 有 hostUri 時，取出開發電腦 IP
- Android 模擬器使用 10.0.2.2
- 其他情境使用 localhost

這能減少課堂中最常見的錯誤：手機連不到電腦上的 FastAPI server。
延伸閱讀：Expo Constants 官方文件。

```
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
if (expoHost) return `http://${expoHost}:8000`;
if (Platform.OS === "android") return "http://10.0.2.2:8000";
return "http://localhost:8000";
```

**圖片提示詞：** Expo API URL 自動推導圖，Expo Go hostUri、Android 10.0.2.2、localhost 三條路徑連到 FastAPI port 8000

---

## Slide 68：AuthContext：全域登入狀態

登入後，很多頁面都需要知道目前 user。
如果每一頁都自己傳 props，程式會很難維護。

AuthContext 的用途：
- 儲存目前登入者 user
- 提供 signIn()
- 提供 signOut()
- 提供 setUser() 更新個人資料

延伸閱讀：React useContext 官方文件。

**圖片提示詞：** React Context 全域狀態圖，AuthProvider 包住整個 App，Login、Tabs、Settings、ChatRoom 都能讀取 user

---

## Slide 69：createContext 與 Provider

createContext 建立一個全域資料通道。
Provider 把 value 提供給底下所有子元件。

這個聊天 App 在 RootLayout 中包住 AuthProvider：
- 登入頁可以 signIn
- Tabs 可以判斷是否登入
- 設定頁可以 setUser
- 登出可以 signOut

```
<AuthProvider>
  <StatusBar style="dark" />
  <Stack>...</Stack>
</AuthProvider>
```

**圖片提示詞：** Provider 包覆元件樹示意圖，RootLayout 最外層 AuthProvider，內層 Stack 與各頁面共享登入狀態

---

## Slide 70：自訂 useAuth Hook

useAuth() 是一個自訂 Hook。
它把 useContext(AuthContext) 包裝起來，讓頁面不用直接碰 AuthContext。

另外它也加入保護：
- 如果元件沒有放在 AuthProvider 裡面
- 會直接 throw Error
- 方便開發時快速發現架構錯誤

```
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
```

**圖片提示詞：** 自訂 Hook useAuth 示意圖，頁面呼叫 useAuth，內部讀 AuthContext，若沒有 Provider 則顯示錯誤警示

---

## Slide 71：useMemo 穩定 Context Value

AuthProvider 使用 useMemo 包裝 value。
目的不是計算複雜資料，而是讓 context value 的物件參考更穩定。

學習重點：
- React component 每次 render 都會建立新物件
- useMemo 可以在 dependencies 沒變時重用結果
- 這能避免不必要的 context value 變動

延伸閱讀：React useMemo 官方文件。

**圖片提示詞：** useMemo 穩定物件參考示意圖，user 沒變時重用 AuthContext value，user 改變時產生新 value

---

## Slide 72：Route Group：(tabs)

app/(tabs)/ 是 Expo Router 的 route group。
括號資料夾不會出現在網址或 route path 中，但可以用來組織版面。

在這個聊天 App 中的用途：
- 登入後進入 tabs 區域
- friends、chats、settings 共用 Tabs layout
- chat/[friendId] 保留在 Stack 裡，作為聊天室詳細頁

延伸閱讀：Expo Router navigation 官方文件。

**圖片提示詞：** Expo Router route group 架構圖，app/(tabs)/friends chats settings 共用 Tabs，chat/[friendId] 在 Stack 中，括號資料夾不出現在路徑

---

## Slide 73：Tabs 導航

之前的投影片內容以 Stack 為主。
聊天 App 使用 Tabs 建立主要分頁：
- 好友列表
- 聊天列表
- 個人設定

Tabs 適合長時間停留的主要功能區。
Stack 適合登入、註冊、聊天室詳細頁這類進出式頁面。

```
<Tabs>
  <Tabs.Screen name="friends" options={{ title: "好友列表" }} />
  <Tabs.Screen name="chats" options={{ title: "聊天列表" }} />
  <Tabs.Screen name="settings" options={{ title: "個人設定" }} />
</Tabs>
```

**圖片提示詞：** 手機底部 Tab 導航教學圖，三個 tab：好友列表、聊天列表、個人設定，上方顯示 Stack 包住 Tabs

---

## Slide 74：Ionicons 圖示套件

這個聊天 App 使用 @expo/vector-icons 的 Ionicons。
圖示讓 Tab 導航更容易辨識。

學習重點：
- tabBarIcon 是一個函式
- Expo Router 會傳入 color 與 size
- 依照目前是否選取，自動套用 active tint color

```
tabBarIcon: ({ color, size }) => (
  <Ionicons name="people-outline" color={color} size={size} />
)
```

**圖片提示詞：** Tab 圖示教學圖，people、chatbubbles、settings 三個 Ionicons 圖示根據 active color 變色，手機底部導航

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
