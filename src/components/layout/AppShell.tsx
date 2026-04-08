import { type ReactNode, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import Sidebar from "./Sidebar";
import SmartCommand from "@/components/SmartCommand";
import SmartAlerts from "@/components/SmartAlerts";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";

const pageTitles: Record<string, string> = {
  welcome: "الرئيسية",
  market: "تحليل السوق",
  opportunity: "محرك الفرص",
  generator: "مولد البرومبتات",
  dashboard: "لوحة القيادة",
  tools: "أدوات",
  store: "محلل المتجر",
  portfolio: "المحفظة",
  inspiration: "إلهام",
  history: "سجل البرومبتات",
  battle: "مقارنة المحركات",
  batch: "معالج الدفعات",
  niche: "مستكشف النيتش",
  autopilot: "الطيار الآلي",
  settings: "الإعدادات",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { activePage, sidebarOpen, commandPaletteOpen, setCommandPaletteOpen, unreadAlertCount } = useApp();
  const { user, loading, signOut } = useAuth();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useKeyboardShortcuts({
    "ctrl+k": () => setCommandPaletteOpen(true),
    "escape": () => {
      if (commandPaletteOpen) setCommandPaletteOpen(false);
      if (alertsOpen) setAlertsOpen(false);
    },
  });

  const sidebarWidth = isMobile ? "" : sidebarOpen ? "pr-60" : "pr-[68px]";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      {/* Header */}
      <header
        className={`fixed top-0 left-0 z-30 h-[56px] flex items-center justify-between px-5 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-300 ${isMobile ? "right-0" : sidebarOpen ? "right-60" : "right-[68px]"}`}
      >
        <div className="flex items-center gap-3">
          {/* Search / Command Palette trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 text-xs hover:bg-white/[0.08] hover:text-slate-300 transition-all"
          >
            <span>🔍</span>
            <span className="hidden sm:inline">بحث سريع...</span>
            <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-600 border border-white/[0.08]">
              ⌘K
            </kbd>
          </button>

          {/* Alerts */}
          <button
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            🔔
            {unreadAlertCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/40">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* API Status dots */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className={`w-2 h-2 rounded-full transition-colors ${localStorage.getItem("gemini_api_key") ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-700"}`} title="Gemini" />
            <span className={`w-2 h-2 rounded-full transition-colors ${localStorage.getItem("claude_api_key") ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "bg-slate-700"}`} title="Claude" />
            <span className={`w-2 h-2 rounded-full transition-colors ${localStorage.getItem("openai_api_key") ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-700"}`} title="OpenAI" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">
            {pageTitles[activePage] || "Stock AI PRO"}
          </h1>
          <span className="text-xs text-slate-600 font-mono hidden sm:inline">v3.1</span>

          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-white font-medium truncate max-w-[100px]">{user.email}</p>
                <button 
                  onClick={() => signOut()}
                  className="text-[9px] text-slate-500 hover:text-red-400 block ml-auto"
                >
                  تسجيل الخروج
                </button>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold border border-white/20">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all"
            >
              تسجيل الدخول
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`pt-[68px] transition-all duration-300 ${sidebarWidth} ${isMobile ? "pb-20" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => setAuthModalOpen(false)} 
      />

      {/* Command Palette */}
      {commandPaletteOpen && (
        <SmartCommand onClose={() => setCommandPaletteOpen(false)} />
      )}

      {/* Alerts Panel */}
      {alertsOpen && (
        <SmartAlerts onClose={() => setAlertsOpen(false)} />
      )}
    </div>
  );
}
