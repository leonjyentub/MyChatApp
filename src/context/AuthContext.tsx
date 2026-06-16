import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ApiProvider, loadApiProvider, setApiProvider } from "../api/chat";
import {
  logout as firebaseLogout,
  subscribeToAuthState,
} from "../api/firebase";
import type { User } from "../types/chat";

type AuthContextValue = {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
  setUser: (user: User) => void;
  apiProvider: ApiProvider;
  switchApiProvider: (provider: ApiProvider) => Promise<void>;
  isLoadingProvider: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [apiProvider, setApiProviderState] = useState<ApiProvider>("firebase");
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);

  // App 啟動時自動加載 API 來源，Firebase 模式會同步還原已登入帳號。
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    async function init() {
      const provider = await loadApiProvider();
      if (!isMounted) return;

      setApiProviderState(provider);

      if (provider !== "firebase") {
        setIsLoadingProvider(false);
        return;
      }

      unsubscribe = subscribeToAuthState(
        (nextUser) => {
          if (!isMounted) return;
          setUser(nextUser);
          setIsLoadingProvider(false);
        },
        (err) => {
          console.warn("[AuthContext] Firebase Auth 狀態還原失敗:", err);
          if (isMounted) {
            setUser(null);
            setIsLoadingProvider(false);
          }
        },
      );
    }

    init();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // 切換 API 來源
  const switchApiProvider = async (provider: ApiProvider) => {
    // 1. 切換時強制登出，防範狀態混亂
    setUser(null);
    if (apiProvider === "firebase") {
      try {
        await firebaseLogout();
      } catch (err) {
        console.warn("[AuthContext] Firebase Auth 登出失敗:", err);
      }
    }
    
    // 2. 儲存新的 API 來源並更新 Context 狀態
    await setApiProvider(provider);
    setApiProviderState(provider);
  };

  const handleSignOut = () => {
    setUser(null);
    if (apiProvider === "firebase") {
      firebaseLogout().catch((err) => {
        console.warn("[AuthContext] Firebase Auth 登出失敗:", err);
      });
    }
  };

  const value = useMemo(
    () => ({
      user,
      signIn: setUser,
      signOut: handleSignOut,
      setUser,
      apiProvider,
      switchApiProvider,
      isLoadingProvider,
    }),
    [user, apiProvider, isLoadingProvider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
