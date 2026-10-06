"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { migrateGuestBookings } from "./mybookings";

export interface CustomerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isVerified?: boolean;
}

const TOKEN_KEY = "anli_customer_token";
const USER_KEY = "anli_customer_user";
const API_BASE = (process.env.NEXT_PUBLIC_DISCOVERY_API_URL ?? "").replace(
  /\/$/,
  "",
);

export function authEnabled(): boolean {
  return API_BASE.length > 0;
}

async function post<T>(
  path: string,
  body: unknown,
  token?: string | null,
  method = "POST",
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const m = data?.message;
    throw new Error(
      Array.isArray(m) ? m.join("; ") : (m ?? `Request failed (${res.status})`),
    );
  }
  return data as T;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

interface AuthContextValue {
  user: CustomerUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(token: string, user: CustomerUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const u = localStorage.getItem(USER_KEY);
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await post<{ access_token: string; data: CustomerUser }>(
      "/customers/login",
      { email, password },
    );
    persist(data.access_token, data.data);
    setToken(data.access_token);
    setUser(data.data);
    migrateGuestBookings(String(data.data.id));
  }, []);

  const register = useCallback(async (d: RegisterData) => {
    await post("/customers/register", d);
    // Backend sends an OTP to the email; verification completes signup.
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const data = await post<{
      access_token?: string;
      customer?: CustomerUser;
    }>("/customers/verify-otp", { email, otp: code });
    if (!data.access_token || !data.customer) {
      throw new Error("Verification failed — please try again.");
    }
    persist(data.access_token, data.customer);
    setToken(data.access_token);
    setUser(data.customer);
    migrateGuestBookings(String(data.customer.id));
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await post("/customers/resend-otp", { email });
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
    }) => {
      const data = await post<{ data: CustomerUser }>(
        "/customers/profile",
        patch,
        token,
        "PATCH",
      );
      const updated = data.data ?? ({ ...user, ...patch } as CustomerUser);
      if (token) persist(token, updated);
      setUser(updated);
    },
    [token, user],
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      await post(
        "/customers/change-password",
        { oldPassword, newPassword },
        token,
      );
    },
    [token],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      user,
      token,
      ready,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      updateProfile,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Display name for headers/avatars. */
export function displayName(u: CustomerUser): string {
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
}
