# React Native 串接 FastAPI 全端開發教學-6：測試除錯

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

## Slide 75：Redirect：保護登入後頁面

TabsLayout 會先檢查 user。
如果沒有登入，就回到首頁。

這是前端路由保護：
- 未登入不能看到好友列表
- 未登入不能看到聊天列表
- 未登入不能進設定頁

注意事項：前端 Redirect 提升使用者體驗，但後端仍要做資料權限檢查。
延伸閱讀：Expo Router Redirect 官方文件。

```
if (!user) {
  return <Redirect href="/" />;
}
```

**圖片提示詞：** 登入保護流程圖，未登入進入 tabs 時 Redirect 到 login，已登入則看到 friends chats settings

---

## Slide 76：useFocusEffect：畫面回來時重新載入

之前的投影片內容使用 useEffect 載入資料。
聊天 App 可以使用 useFocusEffect，讓畫面每次重新聚焦時都能重新讀取。

適合情境：
- 從聊天室回到聊天列表，要更新最後一則訊息
- 新增好友後回到好友列表，要看到最新好友
- Tab 切換回來時重新 fetch

Expo Router 文件建議 callback 搭配 useCallback，避免 effect 過度執行。

**圖片提示詞：** useFocusEffect 時機圖，畫面進入 focus 時呼叫 API，離開 unfocus，回到 tab 時再次載入資料

---

## Slide 77：useCallback：穩定函式依賴

useFocusEffect 內的 callback 需要穩定。
因此可以把 loadFriends 與 loadMessages 包成 useCallback。

學習重點：
- useCallback 會在 dependencies 沒變時重用同一個函式
- dependencies 改變時才建立新函式
- 常用於 effect、focus effect、傳給子元件的 handler

延伸閱讀：React useCallback 官方文件。

```
const loadMessages = useCallback(async () => {
  if (!user || !friendId) return;
  const data = await getMessages(user.id, friendId);
  setMessages(data);
}, [friendId, user]);
```

**圖片提示詞：** useCallback 依賴陣列示意圖，user 或 friendId 改變才建立新的 loadMessages，供 useFocusEffect 使用

---

## Slide 78：Link asChild 與 Pressable

Login 頁用 Link href="/register" asChild 包住 Pressable。
這樣可以同時得到：
- Expo Router 的連結導航
- React Native Pressable 的按壓樣式與互動

Expo Router 文件說明：Link 預設會把內容放在 Text 內；若要完整控制按鈕外觀，可使用 asChild。

```
<Link href="/register" asChild>
  <Pressable style={commonStyles.secondaryButton}>
    <Text>建立新帳號</Text>
  </Pressable>
</Link>
```

**圖片提示詞：** Link asChild 示意圖，Expo Router Link 導航能力套到 React Native Pressable 按鈕外觀上

---

## Slide 79：表單輸入的實務屬性

聊天 App 的 TextInput 可以加入幾個實務屬性：
- autoCapitalize="none"：帳號、URL 不自動大寫
- secureTextEntry：密碼輸入隱藏文字
- multiline：聊天訊息可輸入多行
- placeholder：提示欄位用途

這些不是資料邏輯，但會大幅影響 App 的使用體驗。

**圖片提示詞：** React Native TextInput 表單屬性圖，帳號欄位不自動大寫，密碼欄位隱藏，多行聊天輸入框，手機 UI 教學圖

---

## Slide 80：FlatList 進階顯示技巧

聊天 App 的列表比文章列表更完整。
這裡可以使用：
- ListEmptyComponent：沒有好友或沒有聊天時顯示空狀態
- contentContainerStyle：設定列表內距與 gap
- numberOfLines={1}：聊天摘要只顯示一行
- keyExtractor：用穩定 id 當 key

學習重點：列表不只是 renderItem，也要設計空資料與文字太長時的畫面。

**圖片提示詞：** FlatList 進階功能資訊圖，renderItem、keyExtractor、ListEmptyComponent、numberOfLines、contentContainerStyle 對應聊天列表 UI

---

## Slide 81：UserAvatar：圖片與 fallback UI

UserAvatar 元件會依照是否有 avatar_url 決定顯示方式：
- 有 uri：使用 Image 顯示遠端圖片
- 沒有 uri：用姓名第一個字母產生 fallback 頭像

這是元件化思維：
- 把重複 UI 包成可重用元件
- 用 props 控制 name、uri、size
- 讓好友列表、聊天列表、設定頁都能共用

**圖片提示詞：** UserAvatar 元件化示意圖，有照片時顯示圓形圖片，沒照片時顯示姓名首字母，三個不同大小的頭像範例

---

## Slide 82：KeyboardAvoidingView：聊天輸入列

聊天室底部有輸入框。
手機鍵盤彈出時，輸入框不能被蓋住。

聊天室畫面可以使用 KeyboardAvoidingView：
- iOS 使用 behavior="padding"
- Android 先使用 undefined，避免平台行為差異造成版面問題
- inputBar 固定在畫面底部

延伸閱讀：React Native KeyboardAvoidingView 官方文件。

**圖片提示詞：** 聊天畫面鍵盤避讓示意圖，鍵盤彈出時輸入列往上移動，訊息列表保持可見，標示 iOS padding 行為

---

## Slide 83：送出訊息：樂觀更新與錯誤恢復

onSend 的流程：
1. trim 清除前後空白
2. 先清空輸入框
3. 呼叫 sendMessage API
4. 成功後把 created message 加到 messages
5. 失敗時把 draft 放回輸入框

這比單純重新 fetch 更有互動感，也讓學生理解使用者體驗與錯誤處理要一起設計。

```
const draft = text.trim();
setText("");
try {
  const created = await sendMessage(user.id, friendId, draft);
  setMessages((current) => [...current, created]);
} catch (err) {
  setText(draft);
}
```

**圖片提示詞：** 聊天送出訊息流程圖，清空輸入框、API 成功加入訊息泡泡、API 失敗恢復草稿，使用者體驗教學圖

---

## Slide 84：延伸課程實作任務

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

**圖片提示詞：** 聊天 App 延伸課程任務總覽圖，後端 API、前端 Tabs、AuthContext、好友、訊息、下一階段 SQLite JWT 資料庫，完整課程路線圖

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
