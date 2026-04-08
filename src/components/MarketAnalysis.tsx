// src/components/MarketAnalysis.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { categories, type MarketTrend } from "@/data/marketData";
import { toast } from "sonner";
import OneClickOpportunity from "@/components/OneClickOpportunity";
import { createSourcePulse, pulseLocalTrends, fetchMarketPulseFromBackend } from "@/lib/livePulse";
import { StatsService } from "@/lib/StatsService";
import { formatNumber } from "@/lib/shared";

function DemandBadge({ demand }: { demand: string }) {
  const config = {
    high: { label: "🔴 مرتفع", cls: "bg-primary/20 text-primary border-primary" },
    medium: { label: "🟡 متوسط", cls: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow" },
    low: { label: "🟢 منخفض", cls: "bg-cyber-red/20 text-cyber-red border-cyber-red" },
  }[demand] || { label: demand, cls: "" };
  return <span className={`inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono ${config.cls}`}>{config.label}</span>;
}

function CompetitionBadge({ competition }: { competition: string }) {
  const config = {
    high: { label: "🔴 شرسة", cls: "bg-primary/20 text-primary border-primary" },
    medium: { label: "🟡 متوسطة", cls: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow" },
    low: { label: "🟢 قليلة", cls: "bg-cyber-red/20 text-cyber-red border-cyber-red" },
  }[competition] || { label: competition, cls: "" };
  return <span className={`inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono ${config.cls}`}>{config.label}</span>;
}

function demandWeight(demand: MarketTrend["demand"]): number {
  if (demand === "high") return 100;
  if (demand === "medium") return 70;
  return 40;
}

function competitionWeight(competition: MarketTrend["competition"]): number {
  if (competition === "low") return 100;
  if (competition === "medium") return 65;
  return 30;
}

function normalizeSearches(searches: number): number {
  const min = 3000;
  const max = 15000;
  const clamped = Math.max(min, Math.min(max, searches || min));
  return Math.round(((clamped - min) / (max - min)) * 100);
}

function getOpportunityScore(item: MarketTrend): number {
  const demand = demandWeight(item.demand) * 0.35;
  const competition = competitionWeight(item.competition) * 0.3;
  const profitability = Math.max(0, Math.min(100, item.profitability)) * 0.25;
  const searches = normalizeSearches(item.searches) * 0.1;
  return Math.round(demand + competition + profitability + searches);
}

function scoreLabel(score: number): string {
  if (score >= 85) return "🔥 ممتازة";
  if (score >= 70) return "✅ قوية";
  if (score >= 55) return "⚠️ متوسطة";
  return "🧪 تجريبية";
}

export default function MarketAnalysis() {
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [demandFilter, setDemandFilter] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("");
  const [goldFilter, setGoldFilter] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [oneClickTrend, setOneClickTrend] = useState<MarketTrend | null>(null);
  const [autoPulse, setAutoPulse] = useState(true);
  const [pulseSeconds, setPulseSeconds] = useState(45);

  // Load data on mount using StatsService (cached for 5 min)
  useEffect(() => {
    const load = async () => {
      try {
        const data = await StatsService.fetchMarketData();
        setTrends(data);
        setLastRefresh(new Date().toLocaleTimeString("ar-EG"));
      } catch (e) {
        toast.error("فشل تحميل بيانات السوق.");
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return trends
      .filter((item) => {
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (demandFilter && item.demand !== demandFilter) return false;
        if (competitionFilter && item.competition !== competitionFilter) return false;
        if (goldFilter === "gold" && !(item.demand === "high" && item.competition === "low")) return false;
        return true;
      })
      .sort((a, b) => b.profitability - a.profitability);
  }, [trends, categoryFilter, demandFilter, competitionFilter, goldFilter]);

  const sourcePulse = useMemo(() => createSourcePulse(trends), [trends, lastRefresh]);

  const handleRefreshTrends = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await StatsService.fetchMarketData();
      setTrends(data);
      setLastRefresh(new Date().toLocaleTimeString("ar-EG"));
      toast.success("🔄 تم تحديث التراندات بنجاح!");
    } catch (e) {
      toast.error("تعذر تحديث التراندات.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAnalyze = async (topic: string) => {
    setSelectedTopic(topic);
    setAnalyzing(true);
    setAiAnalysis("");
    try {
      const item = trends.find((t) => t.topic === topic) ?? trends[0];
      const score = StatsService.getTrendScore(item);
      await new Promise((res) => setTimeout(res, 800));
      setAiAnalysis(`تحليل AI للموضوع: ${topic} – درجة الاتجاه: ${score}%`);
    } catch {
      toast.error("خطأ في التحليل.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto‑pulse to keep UI fresh without exhausting API keys
  useEffect(() => {
    if (!autoPulse) return;
    const ms = Math.max(15, pulseSeconds) * 1000;
    const id = window.setInterval(async () => {
      if (refreshing || analyzing) return;
      const backendTrends = await fetchMarketPulseFromBackend();
      if (backendTrends?.length) {
        setTrends(backendTrends);
        setLastRefresh(new Date().toLocaleTimeString("ar-EG"));
        return;
      }
      setTrends((prev) => pulseLocalTrends(prev));
      setLastRefresh(new Date().toLocaleTimeString("ar-EG"));
    }, ms);
    return () => window.clearInterval(id);
  }, [autoPulse, pulseSeconds, refreshing, analyzing]);

  const selectClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";

  return (
    <div className="animate-fade-in space-y-5">
      {/* Filters */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔍 فلاتر البحث</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">فئة المحتوى:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
              <option value="">الكل</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">مستوى الطلب:</label>
            <select value={demandFilter} onChange={(e) => setDemandFilter(e.target.value)} className={selectClass}>
              <option value="">الكل</option>
              <option value="high">مرتفع</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>
          </div>
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">مستوى المنافسة:</label>
            <select value={competitionFilter} onChange={(e) => setCompetitionFilter(e.target.value)} className={selectClass}>
              <option value="">الكل</option>
              <option value="high">شرسة</option>
              <option value="medium">متوسطة</option>
              <option value="low">قليلة</option>
            </select>
          </div>
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">الفرص الذهبية فقط:</label>
            <select value={goldFilter} onChange={(e) => setGoldFilter(e.target.value)} className={selectClass}>
              <option value="">عرض الكل</option>
              <option value="gold">⭐ الفرص الذهبية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Refresh & Info */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleRefreshTrends}
          disabled={refreshing}
          className="gradient-primary text-primary-foreground px-6 py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              جاري تحديث التراندات...
            </>
          ) : (
            "🔄 تحديث التراندات"
          )}
        </button>
        <div className="flex-1 bg-accent/20 border-r-4 border-accent p-3 rounded-md text-accent font-mono text-sm flex items-center gap-2">
          ⭐ الفرص الذهبية = طلب مرتفع + منافسة قليلة
          {lastRefresh && <span className="text-secondary text-[10px] mr-auto">آخر تحديث: {lastRefresh}</span>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow overflow-x-auto">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">📊 التراندات والفرص ({filtered.length} نتيجة)</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary/10 border-b-2 border-primary">
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">الموضوع</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">الطلب</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">المنافسة</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">الربحية</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">Score</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">الفرصة</th>
              <th className="p-3 text-right text-primary font-mono text-xs font-semibold text-glow">تحليل AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const isGold = item.demand === "high" && item.competition === "low";
              const score = getOpportunityScore(item);
              return (
                <tr key={`${item.topic}-${idx}`} className="hover:bg-primary/5 transition-colors border-b border-primary/20">
                  <td className="p-2.5 text-secondary font-mono text-xs">{item.topic}</td>
                  <td className="p-2.5"><DemandBadge demand={item.demand} /></td>
                  <td className="p-2.5"><CompetitionBadge competition={item.competition} /></td>
                  <td className="p-2.5">
                    <span className={`inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono ${
                      item.profitability >= 85
                        ? "bg-primary/20 text-primary border-primary"
                        : item.profitability >= 75
                        ? "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow"
                        : "bg-cyber-red/20 text-cyber-red border-cyber-red"
                    }`}>${item.profitability}%</span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono ${
                        score >= 85
                          ? "bg-accent/20 text-accent border-accent"
                          : score >= 70
                          ? "bg-primary/20 text-primary border-primary"
                          : score >= 55
                          ? "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow"
                          : "bg-cyber-red/20 text-cyber-red border-cyber-red"
                      }`} title={`Demand: ${item.demand} | Competition: ${item.competition} | Profitability: ${item.profitability}% | Searches: ${item.searches}`}>
                        {score}/100 {scoreLabel(score)}
                      </span>
                      <span className="text-[9px] text-secondary font-mono">طلب: {item.demand} • منافسة: {item.competition} • بحث: {formatNumber(item.searches)}</span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    {isGold ? (
                      <span className="inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono bg-accent/20 text-accent border-accent box-glow-gold">⭐ ذهبية</span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-sm text-[11px] font-semibold border font-mono bg-cyber-red/20 text-cyber-red border-cyber-red">عادية</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <button onClick={() => handleAnalyze(item.topic)} className="px-3 py-1 rounded text-[11px] font-mono font-semibold gradient-primary text-primary-foreground hover:box-glow-strong transition-all">
                      🧠 تحليل
                    </button>
                    <button onClick={() => setOneClickTrend(item)} className="ml-2 px-3 py-1 rounded text-[11px] font-mono font-semibold bg-accent/20 text-accent border border-accent/30 hover:bg-accent/25 hover:box-glow transition-all" title="تحليل + توليد برومبت بضغطة واحدة">
                      ⚡ One-Click
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center text-secondary font-mono text-sm py-8">لا توجد نتائج مطابقة للفلاتر المحددة</div>}
      </div>

      {/* AI Analysis result */}
      {(analyzing || aiAnalysis) && (
        <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold animate-fade-in">
          <h3 className="text-base font-semibold text-accent text-glow-gold mb-4 font-mono">🧠 تحليل AI لـ "{selectedTopic}"</h3>
          {analyzing ? (
            <div className="flex items-center gap-3 text-secondary font-mono text-sm">
              <div className="w-5 h-5 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              جاري التحليل بالذكاء الاصطناعي...
            </div>
          ) : (
            <div className="text-secondary font-arabic text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
          )}
        </div>
      )}

      {oneClickTrend && <OneClickOpportunity trend={oneClickTrend} onClose={() => setOneClickTrend(null)} />}

      {/* Source Pulse Monitor */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🌐 Source Pulse Monitor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sourcePulse.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="no-underline bg-primary/5 border border-primary/20 rounded-md p-3 hover:bg-primary/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-primary font-mono text-xs font-semibold">{s.name}</span>
                <span className={`text-[10px] font-mono ${s.status === "live" ? "text-primary" : s.status === "delayed" ? "text-cyber-yellow" : "text-secondary"}`}>
                  {s.status === "live" ? "LIVE" : s.status === "delayed" ? "DELAYED" : "MANUAL"}
                </span>
              </div>
              <div className="mt-2 text-secondary font-mono text-[10px]">Topic: <span className="text-primary">{s.detectedTopic}</span></div>
              <div className="mt-1 text-secondary font-mono text-[10px]">Impact: <span className="text-accent">{s.impact}%</span> | Delta: <span className={s.delta >= 0 ? "text-primary" : "text-destructive"}>{s.delta >= 0 ? "+" : ""}{s.delta}%</span></div>
              <div className="mt-1 text-secondary font-mono text-[10px]">آخر فحص: {s.lastChecked}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
