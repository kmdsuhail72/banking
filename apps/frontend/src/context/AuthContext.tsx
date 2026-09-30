"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  api,
  setAccessToken,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/api";
import {
  AuthUserResponse,
  ICustomer,
  IAccount,
  ITransaction,
  AccountType,
  RegisterDto,
  LoginDto,
  UpdateCustomerDto,
  CreateAccountDto,
} from "@banking/shared-types";

interface AuthContextType {
  user: AuthUserResponse | null;
  customer: ICustomer | null;
  accounts: IAccount[];
  transactions: ITransaction[];
  totalBalanceMinor: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAccounts: () => Promise<IAccount[]>;
  refreshTransactions: () => Promise<ITransaction[]>;
  createAccount: (dto: CreateAccountDto) => Promise<IAccount>;
  updateCustomerProfile: (dto: UpdateCustomerDto) => Promise<ICustomer>;
  isDemoMode: boolean;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async (): Promise<IAccount[]> => {
    try {
      const res = await api<{ accounts: IAccount[] }>("/api/v1/accounts");
      const list = res.accounts || [];
      setAccounts(list);
      return list;
    } catch {
      setAccounts([]);
      return [];
    }
  }, []);

  const fetchTransactions = useCallback(async (): Promise<ITransaction[]> => {
    try {
      const res = await api<{ data: ITransaction[] }>(
        "/api/v1/transactions?limit=10",
      );
      const list = res.data || [];
      setTransactions(list);
      return list;
    } catch {
      setTransactions([]);
      return [];
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        setCustomer(null);
        setAccounts([]);
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      // Fetch current authenticated user
      const userData = await api<AuthUserResponse>("/api/v1/auth/me");
      setUser(userData);

      // Fetch customer profile
      try {
        const customerData = await api<ICustomer>("/api/v1/customers/me");
        setCustomer(customerData);
      } catch {
        setCustomer(null);
      }

      // Fetch accounts and transactions
      await Promise.allSettled([fetchAccounts(), fetchTransactions()]);
    } catch {
      setUser(null);
      setCustomer(null);
      setAccounts([]);
      setTransactions([]);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAccounts, fetchTransactions]);

  useEffect(() => {
    void (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
      } catch {
        /* No active session. */
      }
      await fetchProfile();
    })();
    const expired = () => {
      setUser(null);
      setCustomer(null);
      setAccounts([]);
      setTransactions([]);
      if (
        window.location.pathname.startsWith("/dashboard") ||
        window.location.pathname === "/profile"
      ) {
        window.location.assign(
          `/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
      }
    };
    window.addEventListener("auth:expired", expired);
    return () => window.removeEventListener("auth:expired", expired);
  }, [fetchProfile]);

  const login = async (dto: LoginDto) => {
    setIsLoading(true);
    try {
      const res = await api<any>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(dto),
      });

      const token = res.accessToken || res.tokens?.accessToken;
      if (token) {
        setAccessToken(token);
      }
      setUser(res.user);

      // Fetch customer profile after login
      try {
        const customerData = await api<ICustomer>("/api/v1/customers/me");
        setCustomer(customerData);
      } catch {
        setCustomer(null);
      }

      await Promise.allSettled([fetchAccounts(), fetchTransactions()]);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterDto) => {
    return api<any>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  };

  const logout = async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      setUser(null);
      setCustomer(null);
      setAccounts([]);
      setTransactions([]);
    }
  };

  const createAccount = async (dto: CreateAccountDto): Promise<IAccount> => {
    const newAccount = await api<IAccount>("/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    await fetchAccounts();
    return newAccount;
  };

  const updateCustomerProfile = async (
    dto: UpdateCustomerDto,
  ): Promise<ICustomer> => {
    if (!customer?.id && !user?.id) {
      throw new Error("Not authenticated");
    }
    const identifier = customer?.id || customer?.userId || user?.id;
    const updated = await api<ICustomer>(`/api/v1/customers/${identifier}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    setCustomer(updated);
    return updated;
  };

  const totalBalanceMinor = accounts
    .filter((a) => a.status === "ACTIVE")
    .reduce((sum, a) => sum + (a.balanceMinor || 0), 0);

  const isDemoMode =
    typeof window !== "undefined" && getAccessToken() === "__demo__";

  const enterDemoMode = () => {
    setAccessToken("__demo__");
    setIsLoading(true);
    fetchProfile();
  };

  const value: AuthContextType = {
    user,
    customer,
    accounts,
    transactions,
    totalBalanceMinor,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshProfile: fetchProfile,
    refreshAccounts: fetchAccounts,
    refreshTransactions: fetchTransactions,
    createAccount,
    updateCustomerProfile,
    isDemoMode,
    enterDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
