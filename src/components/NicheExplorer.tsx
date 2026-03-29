import { useState, useMemo, useEffect } from "react";
import { marketData as staticData, type MarketTrend } from "@/data/marketData";
import { EMERGING_TRENDS_2026 } from "@/data/trends2026";
import { useApp } from "@/contexts/AppContext";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

interface NicheInfo {
  name: string;
  category: string;
  marketSize: number; // relative 1-100
  competition: "low" | "medium" | "high";
  growth: number; // percent
  opportunity: number; // 1-100
  trending: boolean;
}

function computeNiches(data: MarketTrend[]): NicheInfo[] {
  return data.map((t) => {
    const compScore = t.competition === "low" ? 30 : t.competition === "medium" ? 60 : 90;
    const opportunity = Math.round(
      (t.demand === "high" ? 40 : t.demand === "medium" ? 25 : 10) +
      (100 - compScore) * 0.3 +
      t.profitability * 0.3
    );
    return {
      name: t.topic,
      category: t.category,
      marketSize: Math.min(100, Math.round((t.searches / 150))),
      competition: t.competition,
      growth: Math.round(t.profitability > 80 ? 30 + (t.profitability % 10) : t.profitability > 60 ? 15 + (t.searches % 5) : 5),
      opportunity: Math.min(100, opportunity),
      trending: t.demand === "high" && t.profitability > 75,
    };
  });
}

export default function NicheExplorer() {
  const { setActivePage } = useApp();
  const [sortBy, setSortBy] = useState<"opportunity" | "growth" | "marketSize">("opportunity");
  const [compFilter, setCompFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [baseData, setBaseData] = useState<MarketTrend[]>(staticData);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("gemini_live_trends");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBaseData(parsed);
        }
      }
    } catch {}
  }, []);

  const niches = useMemo(() => computeNiches(baseData), [baseData]);
  const categories = [...new Set(niches.map((n) => n.category))];

  const filtered = useMemo(() => {
    return niches
      .filter((n) => {
        if (compFilter && n.competition !== compFilter) return false;
        if (catFilter && n.category !== catFilter) return false;
        if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [niches, sortBy, compFilter, catFilter, search]);

  const topOpportunities = niches.filter((n) => n.opportunity >= 70).length;
  const trendingCount = niches.filter((n) => n.trending).length;
  const avgGrowth = Math.round(niches.reduce((s, n) => s + n.growth, 0) / niches.length);

  const compColors = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    high: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const compLabels = {
    low: "🟢 قليلة",
    medium: "🟡 متوسطة",
    high: "🔴 شرسة",
  };

  const opportunityColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const opportunityLabel = (score: number) => {
    if (score >= 80) return "🔥 ممتازة";
    if (score >= 60) return "✅ قوية";
    if (score >= 40) return "⚠️ متوسطة";
    return "🧪 تجريبية";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/[0.08] p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">🗺️ مستكشف النيتشات</h2>
          <p className="text-[11px] text-slate-500">خريطة تفاعلية لكل نيتش — حجم السوق، المنافسة، معدل النمو، وفرصة الدخول</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "فرص قوية (≥70)", value: topOpportunities, icon: "⭐", color: "text-amber-400" },
          { label: "نيتش في صعود", value: trendingCount, icon: "📈", color: "text-emerald-400" },
          { label: "متوسط النمو", value: avgGrowth, suffix: "%", icon: "🚀", color: "text-blue-400" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
            <span className="text-xl">{s.icon}</span>
            <AnimatedCounter end={s.value} suffix={s.suffix} className={`block text-xl font-bold ${s.color} mt-1`} />
            <p className="text-[10px] text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث عن نيتش..."
          className="bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2 rounded-xl flex-1 min-w-[150px] placeholder:text-slate-600"
        />
        <select value={compFilter} onChange={(e) => setCompFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 px-3 py-2 rounded-xl">
          <option value="">كل المنافسات</option>
          <option value="low">منافسة قليلة</option>
          <option value="medium">منافسة متوسطة</option>
          <option value="high">منافسة شرسة</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 px-3 py-2 rounded-xl">
          <option value="">كل الفئات</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 px-3 py-2 rounded-xl">
          <option value="opportunity">ترتيب: الفرصة</option>
          <option value="growth">ترتيب: النمو</option>
          <option value="marketSize">ترتيب: حجم السوق</option>
        </select>
      </div>

      {/* Niche Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((niche, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group cursor-pointer"
            onClick={() => setActivePage("opportunity")}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  {niche.name}
                  {niche.trending && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">🔥 trending</span>}
                </h4>
                <span className="text-[10px] text-slate-600">{niche.category}</span>
              </div>
              <span className={`text-lg font-bold ${opportunityColor(niche.opportunity)}`}>
                {niche.opportunity}
              </span>
            </div>

            {/* Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                  <span>حجم السوق</span>
                  <span>{niche.marketSize}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${niche.marketSize}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                  <span>النمو</span>
                  <span className="text-emerald-400">+{niche.growth}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, niche.growth * 1.5)}%` }} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${compColors[niche.competition]}`}>
                {compLabels[niche.competition]}
              </span>
              <span className={`text-[9px] font-semibold ${opportunityColor(niche.opportunity)}`}>
                {opportunityLabel(niche.opportunity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600 text-sm">لا توجد نيتشات مطابقة</div>
      )}
    </div>
  );
}
