import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Subscription {
  id: number;
  plan: string;
  status: string;
  amount: number;
  cardLast4: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  schoolId: number | null;
  schoolName: string;
  subscription: Subscription | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  schoolId?: number;
  schoolName?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("auth_token");
    window.location.href = `${BASE}/login`;
    throw new Error(data.error || "انتهت الجلسة");
  }
  if (!res.ok) throw new Error(data.error || "خطأ غير متوقع");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    const t = localStorage.getItem("auth_token");
    if (!t) { setIsLoading(false); return; }
    try {
      const data = await apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` }
      });
      setUser(data);
    } catch {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { refreshUser(); }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(form: RegisterData) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
