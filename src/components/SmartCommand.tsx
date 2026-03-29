import { useState, useRef, useEffect } from "react";
import { useApp, type ActivePage } from "@/contexts/AppContext";

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  category: string;
  keywords: string[];
}

export default function SmartCommand({ onClose }: { onClose: () => void }) {
  const { setActivePage } = useApp();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-welcome", label: "الرئيسية", icon: "🏠", action: () => { setActivePage("welcome"); onClose(); }, category: "تنقل", keywords: ["home", "رئيسية", "بداية"] },
    { id: "nav-market", label: "تحليل السوق", icon: "📊", action: () => { setActivePage("market"); onClose(); }, category: "تنقل", keywords: ["market", "سوق", "تحليل", "trends"] },
    { id: "nav-dashboard", label: "لوحة القيادة", icon: "📈", action: () => { setActivePage("dashboard"); onClose(); }, category: "تنقل", keywords: ["dashboard", "لوحة", "إحصائيات"] },
    { id: "nav-opportunity", label: "محرك الفرص", icon: "🧠", action: () => { setActivePage("opportunity"); onClose(); }, category: "تنقل", keywords: ["opportunity", "فرص", "فرصة"] },
    { id: "nav-generator", label: "مولد البرومبتات", icon: "🤖", action: () => { setActivePage("generator"); onClose(); }, category: "تنقل", keywords: ["generator", "مولد", "برومبت", "prompt"] },
    { id: "nav-battle", label: "مقارنة المحركات", icon: "⚔️", action: () => { setActivePage("battle"); onClose(); }, category: "تنقل", keywords: ["battle", "مقارنة", "compare", "ai"] },
    { id: "nav-history", label: "سجل البرومبتات", icon: "📜", action: () => { setActivePage("history"); onClose(); }, category: "تنقل", keywords: ["history", "سجل", "تاريخ"] },
    { id: "nav-tools", label: "الأدوات", icon: "🛠️", action: () => { setActivePage("tools"); onClose(); }, category: "تنقل", keywords: ["tools", "أدوات", "keywords"] },
    { id: "nav-store", label: "محلل المتجر", icon: "🔍", action: () => { setActivePage("store"); onClose(); }, category: "تنقل", keywords: ["store", "متجر", "تحليل"] },
    { id: "nav-portfolio", label: "المحفظة", icon: "💼", action: () => { setActivePage("portfolio"); onClose(); }, category: "تنقل", keywords: ["portfolio", "محفظة", "أرباح"] },
    { id: "nav-batch", label: "معالج الدفعات", icon: "📦", action: () => { setActivePage("batch"); onClose(); }, category: "تنقل", keywords: ["batch", "دفعة", "مجموعة"] },
    { id: "nav-niche", label: "مستكشف النيتش", icon: "🗺️", action: () => { setActivePage("niche"); onClose(); }, category: "تنقل", keywords: ["niche", "نيتش", "explore"] },
    { id: "nav-settings", label: "الإعدادات", icon: "⚙️", action: () => { setActivePage("settings"); onClose(); }, category: "تنقل", keywords: ["settings", "إعدادات", "api"] },
    // Quick Actions
    { id: "action-nature", label: "أنشئ برومبت Nature", icon: "🌿", action: () => { setActivePage("generator"); onClose(); }, category: "إجراء سريع", keywords: ["nature", "طبيعة"] },
    { id: "action-tech", label: "أنشئ برومبت Technology", icon: "💻", action: () => { setActivePage("generator"); onClose(); }, category: "إجراء سريع", keywords: ["technology", "تقنية"] },
    { id: "action-food", label: "أنشئ برومبت Food", icon: "🍕", action: () => { setActivePage("generator"); onClose(); }, category: "إجراء سريع", keywords: ["food", "طعام"] },
    // Links
    { id: "link-adobe", label: "افتح Adobe Stock", icon: "🌐", action: () => { window.open("https://stock.adobe.com/contributor", "_blank"); onClose(); }, category: "روابط", keywords: ["adobe", "stock"] },
    { id: "link-trends", label: "افتح Google Trends", icon: "📈", action: () => { window.open("https://trends.google.com", "_blank"); onClose(); }, category: "روابط", keywords: ["google", "trends"] },
  ];

  const filtered = query.trim()
    ? commands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.includes(q))
        );
      })
    : commands;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatItems = filtered;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      flatItems[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 border-b border-white/[0.06]">
          <span className="text-slate-500 text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن أي شيء... (صفحات، أوامر، روابط)"
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-slate-600 outline-none font-sans"
            dir="rtl"
          />
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-600 border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2 custom-scrollbar">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-5 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                {category}
              </div>
              {items.map((item) => {
                const globalIdx = flatItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-right transition-colors ${
                      globalIdx === selectedIndex
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {globalIdx === selectedIndex && (
                      <span className="mr-auto text-[9px] text-slate-600">↵ Enter</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {flatItems.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm">
              لا توجد نتائج لـ "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
