import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { clearToken, getToken, setToken } from "./utils";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const loginMutation = useMutation(api.adminAuth.login);
  const logoutMutation = useMutation(api.adminAuth.logout);

  const isValid = useQuery(
    api.adminAuth.validateSession,
    token ? { token } : "skip",
  );

  const isLoading = token !== null && isValid === undefined;
  const isAuthenticated = token !== null && isValid === true;

  useEffect(() => {
    if (token && isValid === false) {
      clearToken();
      setTokenState(null);
    }
  }, [token, isValid]);

  const login = useCallback(
    async (password: string) => {
      const result = await loginMutation({ password });
      setToken(result.token);
      setTokenState(result.token);
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    if (token) {
      await logoutMutation({ token });
    }
    clearToken();
    setTokenState(null);
  }, [token, logoutMutation]);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [token, isAuthenticated, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
