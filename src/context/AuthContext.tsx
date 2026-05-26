import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import type { User } from "../types/chat";

type AuthContextValue = {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo(
    () => ({
      user,
      signIn: setUser,
      signOut: () => setUser(null),
      setUser,
    }),
    [user],
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
