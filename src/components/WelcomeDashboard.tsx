import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { useEffect, useState, useMemo } from "react";
import { marketData as staticMarketData, type MarketTrend } from "@/data/marketData";
import { getCurrentSeason, formatDateAr } from "@/lib/shared";

export default function WelcomeDashboard() {
  const { setActivePage, hasAnyKey, setGoldOpportunityCount } = useApp();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("");
  const [marketData, setMarketData] = useState<MarketTrend[]>(staticMarketData);

  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem("gemini_live_trends");
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMarketData(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting("ليلة موفقة");
    else if (hour < 12) setGreeting("صباح الخير");
    else if (hour < 18) setGreeting("مساء النور");
    else setGreeting("مساء الخير");
  }, []);

  const goldCount = useMemo(
    () => marketData.filter((i) => i.demand === "high" && i.competition === "low").length,
    [marketData]
  );
  const avgProfit = useMemo(
    () => Math.round(marketData.reduce((s, i) => s + i.profitability, 0) / (marketData.length || 1)),
    [marketData]
  );
  const topTrend = useMemo(
    () => marketData.length > 0 ? marketData.reduce((max, i) => (i.searches > max.searches ? i : max)) : { topic: "—", searches: 0 },
    [marketData]
  );

  useEffect(() => {
    setGoldOpportunityCount(goldCount);
  }, [goldCount, setGoldOpportunityCount]);

  const quickActions = [
    { icon: "🚀", title: "الطيار الآلي", desc: "أتمتة كاملة لدورة العمل", page: "autopilot" as const, gradient: "from-blue-600 to-purple-600", highlighted: true },
    { icon: "📊", title: "حلل السوق", desc: "اكتشف التراندات والفرص", page: "market" as const, gradient: "from-blue-600 to-cyan-500" },
    { icon: "🤖", title: "أنشئ برومبت", desc: "ولّد برومبتات AI احترافية", page: "generator" as const, gradient: "from-purple-600 to-pink-500" },
    { icon: "🧠", title: "محرك الفرص", desc: "اكتشف فرصاً حصرية", page: "opportunity" as const, gradient: "from-amber-600 to-orange-500" },
    { icon: "🔍", title: "حلل المنافسين", desc: "تجسس على كبار البائعين", page: "store" as const, gradient: "from-emerald-600 to-teal-500" },
    { icon: "📦", title: "معالج الدفعات", desc: "حلل مجلد كامل دفعة واحدة", page: "batch" as const, gradient: "from-red-600 to-rose-500" },
  ];

  const goldenOpps = marketData
    .filter((i) => i.demand === "high" && i.competition === "low")
    .sort((a, b) => b.profitability - a.profitability)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/[0.08] p-8 group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent opacity-50 group-hover:opacity-100 transition-all duration-700" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{formatDateAr()} • {getCurrentSeason()}</p>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20 uppercase tracking-tighter">Pro v3.1</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
              {greeting}{user ? `، ${user.email?.split('@')[0]}` : ""} 👋
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              النظام رصد <span className="text-amber-400 font-bold">{goldCount} فرصة ذهبية</span> عالية الربحية اليوم. 
              {user ? (
                <span className="text-emerald-400 font-medium"> الحفظ السحابي نشط وآمن ✅</span>
              ) : (
                <span className="text-slate-500 italic"> سجل دخولك لمزامنة بياناتك مع السحابة.</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center min-w-[100px]">
              <div className="text-xs text-slate-500 mb-1">الربحية</div>
              <div className="text-xl font-bold text-emerald-400">{avgProfit}%</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center min-w-[100px]">
              <div className="text-xs text-slate-500 mb-1">الفرص</div>
              <div className="text-xl font-bold text-amber-400">{goldCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "فرص ذهبية", value: goldCount, icon: "⭐", color: "text-amber-400", bgGlow: "shadow-amber-500/10" },
          { label: "متوسط الربحية", value: avgProfit, suffix: "%", icon: "💰", color: "text-emerald-400", bgGlow: "shadow-emerald-500/10" },
          { label: "تراندات مرصودة", value: marketData.length, icon: "🎯", color: "text-blue-400", bgGlow: "shadow-blue-500/10" },
          { label: "أعلى بحثاً", icon: "🔥", color: "text-red-400", bgGlow: "shadow-red-500/10", textValue: topTrend.topic },
        ].map((stat, i) => (
          <div
            key={i}
            className={`rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] transition-all hover:shadow-xl ${stat.bgGlow} group`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
              <span className="text-[11px] text-slate-500 font-medium">{stat.label}</span>
            </div>
            {stat.textValue ? (
              <div className={`text-sm font-bold ${stat.color} truncate`}>{stat.textValue}</div>
            ) : (
              <AnimatedCounter
                end={stat.value!}
                suffix={stat.suffix}
                className={`text-2xl font-bold ${stat.color}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            ⚡ المهام المؤتمتة والسريعة
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">آخر تحديث: {new Date().toLocaleTimeString("ar-EG")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.page}
              onClick={() => setActivePage(action.page)}
              className={`group text-right rounded-2xl border p-6 transition-all duration-300 relative overflow-hidden ${
                (action as any).highlighted 
                ? "bg-slate-900 border-blue-500/30 shadow-xl shadow-blue-500/10 hover:border-blue-500/50" 
                : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
              }`}
            >
              {(action as any).highlighted && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white text-[9px] font-black uppercase rounded-bl-xl tracking-tighter">
                  Recommended
                </div>
              )}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform ring-1 ring-white/10`}>
                {action.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{action.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Golden Opportunities */}
      {goldenOpps.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            ⭐ الفرص الذهبية الآن
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goldenOpps.map((opp, i) => (
              <button
                key={i}
                onClick={() => setActivePage("opportunity")}
                className="group text-right rounded-2xl bg-amber-500/[0.04] border border-amber-500/10 p-5 hover:bg-amber-500/[0.08] hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{opp.topic}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    {opp.profitability}% ربح
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>📁 {opp.category}</span>
                  <span>🔥 طلب عالي</span>
                  <span>🟢 منافسة قليلة</span>
                  <span>{opp.searches.toLocaleString()} بحث</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Setup Banner (if no API keys) */}
      {!hasAnyKey() && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🔑</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-1">أكمل الإعداد</h3>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                أضف مفتاح API واحد على الأقل (Gemini مجاني من Google) لتفعيل جميع ميزات الذكاء الاصطناعي.
              </p>
              <button
                onClick={() => setActivePage("settings")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold hover:scale-105 transition-all shadow-lg shadow-blue-500/25"
              >
                ⚙️ فتح الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="text-center text-[10px] text-slate-700 pt-4">
        اضغط <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-500 border border-white/[0.08]">Ctrl + K</kbd> للبحث السريع في أي مكان
      </div>
    </div>
  );
}
