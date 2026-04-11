import { useApp, type ActivePage } from "@/contexts/AppContext";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

interface NavItem {
  id: ActivePage;
  label: string;
  icon: string;
  badge?: "gold" | "alerts";
  section: "main" | "ai" | "tools" | "settings";
}

const navItems: NavItem[] = [
  { id: "welcome",     label: "الرئيسية",       icon: "🏠", section: "main" },
  { id: "market",      label: "تحليل السوق",    icon: "📊", section: "main" },
  { id: "dashboard",   label: "لوحة القيادة",   icon: "📈", section: "main" },
  { id: "opportunity", label: "محرك الفرص",      icon: "🧠", badge: "gold", section: "main" },
  { id: "niche",       label: "مستكشف النيتش",   icon: "🗺️", section: "main" },

  { id: "generator",   label: "مولد البرومبتات", icon: "🤖", section: "ai" },
  { id: "battle",      label: "مقارنة المحركات", icon: "⚔️", section: "ai" },
  { id: "history",     label: "سجل البرومبتات",  icon: "📜", section: "ai" },
  { id: "batch",       label: "معالج الدفعات",   icon: "📦", section: "ai" },
  { id: "autopilot",   label: "الطيار الآلي",    icon: "🚀", section: "ai" },

  { id: "tools",       label: "أدوات",           icon: "🛠️", section: "tools" },
  { id: "validator",   label: "محقق المحتوى",   icon: "✅", badge: "alerts", section: "tools" },
  { id: "validator-batch", label: "معالج الملفات", icon: "📁", section: "tools" },
  { id: "store",       label: "محلل المتجر",     icon: "🔍", section: "tools" },
  { id: "portfolio",   label: "المحفظة",         icon: "💼", section: "tools" },
  { id: "inspiration", label: "إلهام",           icon: "💡", section: "tools" },

  { id: "settings",    label: "الإعدادات",       icon: "⚙️", section: "settings" },
];

const sections = [
  { id: "main", label: "الرئيسي" },
  { id: "ai", label: "الذكاء الاصطناعي" },
  { id: "tools", label: "الأدوات" },
  { id: "settings", label: "الإعدادات" },
];

export default function Sidebar() {
  const { activePage, setActivePage, sidebarOpen, setSidebarOpen, goldOpportunityCount, unreadAlertCount } = useApp();
  const [isMobile, setIsMobile] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobile bottom navigation
  if (isMobile) {
    const mobileItems = navItems.filter(n => 
      ["welcome", "market", "generator", "tools", "settings"].includes(n.id)
    );
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-1 py-1.5 safe-area-bottom">
        {mobileItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
              activePage === item.id
                ? "text-blue-400 bg-blue-500/10"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* Overlay for collapsed sidebar on tablets */}
      {!sidebarOpen && (
        <div className="fixed inset-0 z-30 hidden" onClick={() => setSidebarOpen(true)} />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-60" : "w-[68px]"
        } bg-slate-950/80 backdrop-blur-2xl border-l border-white/[0.06]`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20 shrink-0">
            S
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Stock AI PRO</div>
              <div className="text-[10px] text-slate-500">v3.0</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`mr-auto w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all ${sidebarOpen ? "" : "mr-0 mx-auto"}`}
            title={sidebarOpen ? "طي" : "توسيع"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          {sections.map((section) => {
            const items = navItems.filter((n) => n.section === section.id);
            return (
              <div key={section.id} className="mb-3">
                {sidebarOpen && (
                  <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-1.5">
                    {section.label}
                  </div>
                )}
                {items.map((item) => {
                  const isActive = activePage === item.id;
                  const badgeValue =
                    item.badge === "gold" ? goldOpportunityCount :
                    item.badge === "alerts" ? unreadAlertCount : 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      title={!sidebarOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative ${
                        sidebarOpen ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                      } ${
                        isActive
                          ? "bg-gradient-to-l from-blue-500/15 to-purple-500/10 text-blue-400 shadow-[inset_-2px_0_0_0_#3b82f6]"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`text-base shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                        {item.icon}
                      </span>
                      {sidebarOpen && (
                        <span className="text-[13px] font-medium truncate">{item.label}</span>
                      )}
                      {badgeValue > 0 && (
                        <span className={`${sidebarOpen ? "mr-auto" : "absolute -top-1 -left-1"} min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center ${
                          item.badge === "gold"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {badgeValue}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <div className="flex gap-1.5">
                <span className={`w-2 h-2 rounded-full ${localStorage.getItem("gemini_api_key") ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-slate-700"}`} title="Gemini" />
                <span className={`w-2 h-2 rounded-full ${localStorage.getItem("claude_api_key") ? "bg-amber-500 shadow-lg shadow-amber-500/50" : "bg-slate-700"}`} title="Claude" />
                <span className={`w-2 h-2 rounded-full ${localStorage.getItem("openai_api_key") ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-slate-700"}`} title="OpenAI" />
              </div>
              <span>API Status</span>
              <span className="mr-auto text-slate-600 text-[9px]">Ctrl+K</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${localStorage.getItem("gemini_api_key") ? "bg-emerald-500" : "bg-slate-700"}`} />
            </div>
          )}
          {/* Theme toggle button */}
          <button onClick={toggleTheme} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </aside>
    </>
  );
}
