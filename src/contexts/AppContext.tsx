import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getStorageJSON, setStorageJSON } from "@/lib/shared";

// ── Types ──
export type ActivePage =
  | "welcome"
  | "market"
  | "opportunity"
  | "generator"
  | "dashboard"
  | "tools"
  | "store"
  | "portfolio"
  | "inspiration"
  | "history"
  | "battle"
  | "batch"
  | "niche"
  | "settings";

export interface ApiKeyState {
  gemini: string;
  claude: string;
  openai: string;
}

interface Alert {
  id: string;
  type: "gold" | "trend" | "api" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface AppState {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  apiKeys: ApiKeyState;
  setApiKey: (engine: keyof ApiKeyState, key: string) => void;
  hasApiKey: (engine: keyof ApiKeyState) => boolean;
  hasAnyKey: () => boolean;
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, "id" | "timestamp" | "read">) => void;
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  unreadAlertCount: number;
  goldOpportunityCount: number;
  setGoldOpportunityCount: (count: number) => void;
}

const AppContext = createContext<AppState | null>(null);

// ── Provider ──
export function AppProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<ActivePage>(() => {
    return getStorageJSON<ActivePage>("app_active_page", "welcome");
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyState>(() => ({
    gemini: localStorage.getItem("gemini_api_key") || "",
    claude: localStorage.getItem("claude_api_key") || "",
    openai: localStorage.getItem("openai_api_key") || "",
  }));
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    getStorageJSON<Alert[]>("app_alerts", [])
  );
  const [goldOpportunityCount, setGoldOpportunityCount] = useState(0);

  useEffect(() => {
    setStorageJSON("app_active_page", activePage);
  }, [activePage]);

  useEffect(() => {
    setStorageJSON("app_alerts", alerts);
  }, [alerts]);

  const setApiKey = useCallback((engine: keyof ApiKeyState, key: string) => {
    setApiKeys((prev) => ({ ...prev, [engine]: key }));
    const storageKeys: Record<keyof ApiKeyState, string> = {
      gemini: "gemini_api_key",
      claude: "claude_api_key",
      openai: "openai_api_key",
    };
    localStorage.setItem(storageKeys[engine], key);
    window.dispatchEvent(new CustomEvent("gemini-key-updated", { detail: { hasKey: !!key } }));
  }, []);

  const hasApiKey = useCallback((engine: keyof ApiKeyState) => !!apiKeys[engine], [apiKeys]);
  const hasAnyKey = useCallback(() => Object.values(apiKeys).some(Boolean), [apiKeys]);

  const addAlert = useCallback((alert: Omit<Alert, "id" | "timestamp" | "read">) => {
    const newAlert: Alert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        sidebarOpen,
        setSidebarOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        apiKeys,
        setApiKey,
        hasApiKey,
        hasAnyKey,
        alerts,
        addAlert,
        markAlertRead,
        clearAlerts,
        unreadAlertCount,
        goldOpportunityCount,
        setGoldOpportunityCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
