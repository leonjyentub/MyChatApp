import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setUnauthorizedHandler } from "../api/client";
import {
  clearStoredSession,
  getStoredSession,
  storeSession,
} from "../api/sessionStorage";
import type { AuthSession, User } from "../types/chat";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getStoredSession().then((storedSession) => {
      if (!active) return;
      setSession(storedSession);
      setUserState(storedSession?.user ?? null);
      setIsLoading(false);
    });

    setUnauthorizedHandler(() => {
      setSession(null);
      setUserState(null);
    });

    return () => {
      active = false;
      setUnauthorizedHandler(undefined);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signIn: async (nextSession) => {
        await storeSession(nextSession);
        setSession(nextSession);
        setUserState(nextSession.user);
      },
      signOut: async () => {
        await clearStoredSession();
        setSession(null);
        setUserState(null);
      },
      setUser: async (nextUser) => {
        if (!session) return;
        const nextSession = { ...session, user: nextUser };
        await storeSession(nextSession);
        setSession(nextSession);
        setUserState(nextUser);
      },
    }),
    [isLoading, session, user],
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
