import { useState, useEffect, useMemo } from "react";
import { marketData as initialMarketData, dailyTips, seasonalEvents, type MarketTrend } from "@/data/marketData";
import { EMERGING_TRENDS_2026 } from "@/data/trends2026";
import { createSourcePulse, pulseLocalTrends } from "@/lib/livePulse";
import { generateAITrends, hasAnyApiKey } from "@/lib/gemini";
import { clearAllCache } from "@/lib/sanitizer";
import { toast } from "sonner";
import { calcSuccessRate, getTodayAiMetrics } from "@/lib/aiMetrics";
import DailyFeed from "@/components/DailyFeed";
import OneClickOpportunity from "@/components/OneClickOpportunity";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Area, AreaChart
} from "recharts";

const RADIAN = Math.PI / 180;
const COLORS = ['#00D4FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#FF8C42'];

// ── Mini custom tooltip ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-primary/40 rounded-md px-3 py-2 font-mono text-[10px] text-primary shadow-lg">
      {label && <div className="text-secondary mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || "inherit" }}>
          {p.name}: <span className="font-semibold">{p.value}{p.unit || ""}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [marketData, setMarketData] = useState<MarketTrend[]>(initialMarketData);
  const [refreshing, setRefreshing] = useState(false);
  const [tip, setTip] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState<any[]>([]);
  const [aiMetrics, setAiMetrics] = useState(getTodayAiMetrics());
  const [selectedTrendForGeneration, setSelectedTrendForGeneration] = useState<MarketTrend | null>(null);
  const [trendRadar, setTrendRadar] = useState<Array<{topic: string; time: string; prob: string}>>([]);

  const goldOpportunities = useMemo(() => marketData.filter((i) => i.demand === "high" && i.competition === "low").length, [marketData]);
  const avgProfit = useMemo(() => Math.round(marketData.reduce((s, i) => s + i.profitability, 0) / (marketData.length || 1)), [marketData]);
  const topTrend = useMemo(() => marketData.length > 0 ? marketData.reduce((max, i) => (i.searches > max.searches ? i : max)) : { topic: "" }, [marketData]);
  const now = new Date();
  const month = now.getMonth();
  const season =
    month >= 2 && month <= 4 ? "الربيع 🌸" :
    month >= 5 && month <= 7 ? "الصيف ☀️" :
    month >= 8 && month <= 10 ? "الخريف 🍂" : "الشتاء ❄️";

  const top10 = useMemo(() => [...marketData].sort((a, b) => b.searches - a.searches).slice(0, 10), [marketData]);
  const sourcePulse = useMemo(() => createSourcePulse(marketData), [marketData]);

  useEffect(() => {
    setTip(dailyTips[Math.floor(Math.random() * dailyTips.length)]);
    setIdeas([
      `ابحث عن الزوايا غير المطروقة في الفئة التقنية (Blue Ocean).`,
      `أنشئ سلسلة من الأصول مع مساحة فارغة (Copy Space) كبيرة لتسهيل دمج النصوص التصميمية.`,
      `استهدف الكلمات المفتاحية ذات المنافسة القليلة لضمان ظهور أعمالك الأولى.`,
      `ادمج عناصر واقعية مع خلفيات معزولة (Green Screen) لزيادة المبيعات.`,
    ]);

    const loadRealData = async () => {
      // 1. Try to load cached or live data from AI if key exists
      if (hasAnyApiKey()) {
        try {
          const aiTrends = await generateAITrends();
          if (aiTrends && aiTrends.length > 0) {
            setMarketData(aiTrends as MarketTrend[]);
            updateRadar(aiTrends as MarketTrend[]);
            return;
          }
        } catch (e) {
          console.warn("Could not fetch real trends on load, falling back to static", e);
        }
      }
      
      // 2. Fallback to static if no AI or failed
      updateRadar(initialMarketData);
    };

    const updateRadar = (data: MarketTrend[]) => {
      const goldenOps = [...data]
        .filter(t => t.demand === "high" && t.competition === "low")
        .sort((a, b) => b.profitability - a.profitability)
        .slice(0, 3);
      const highDemand = [...data]
        .filter(t => t.demand === "high")
        .sort((a, b) => b.searches - a.searches);

      const radarItems = goldenOps.length >= 3 ? goldenOps : highDemand.slice(0, 3);
      setTrendRadar(radarItems.map((t, i) => ({
        topic: t.topic,
        time: `متوقع قريبًا`,
        prob: `${Math.min(98, t.profitability + 5)}%`,
      })));
    };

    loadRealData();
  }, []);

  useEffect(() => {
    // Just refresh the AI metrics periodically. We removed the fake local pulse for the market data.
    const id = window.setInterval(() => {
      setAiMetrics(getTodayAiMetrics());
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  const handleRefreshTrends = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️ لتحديث التراندات بالذكاء الاصطناعي");
      return;
    }
    setRefreshing(true);
    try {
      // Clear old cache first
      clearAllCache();
      const aiTrends = await generateAITrends();
      setMarketData(aiTrends as MarketTrend[]);

      // Update Trend Radar with fresh data
      const goldenOps = [...(aiTrends as MarketTrend[])]
        .filter(t => t.demand === "high" && t.competition === "low")
        .sort((a, b) => b.profitability - a.profitability)
        .slice(0, 3);
      const highDemand = [...(aiTrends as MarketTrend[])]
        .filter(t => t.demand === "high")
        .sort((a, b) => b.searches - a.searches);
      const radarItems = goldenOps.length >= 3 ? goldenOps : highDemand.slice(0, 3);
      setTrendRadar(radarItems.map((t, i) => ({
        topic: t.topic,
        time: `القادم: ${(i + 1) * 15} يوم`,
        prob: `${Math.min(98, t.profitability + 5)}%`,
      })));

      toast.success("🔄 تم تحديث التراندات بنجاح من بيانات حية!");
    } catch (err: any) {
      toast.error(err.message ? `خطأ: ${err.message}` : "تعذر التحديث بالذكاء الاصطناعي.");
    } finally {
      setRefreshing(false);
    }
  };
  const newTip = () => setTip(dailyTips[Math.floor(Math.random() * dailyTips.length)]);

  // ── Chart data memoized ──
  const barData = useMemo(() => top10.map((item) => ({
    name: item.topic.length > 14 ? item.topic.slice(0, 14) + "…" : item.topic,
    searches: item.searches,
    profit: item.profitability,
  })), [top10]);

  const pieData = useMemo(() => {
    const high = marketData.filter((i) => i.demand === "high").length;
    const medium = marketData.filter((i) => i.demand === "medium").length;
    const low = marketData.filter((i) => i.demand === "low").length;
    return [
      { name: "طلب مرتفع", value: high, color: "#00ff88" },
      { name: "طلب متوسط", value: medium, color: "#ffd700" },
      { name: "طلب منخفض", value: low, color: "#ff6b6b" },
    ];
  }, [marketData]);

  const compPieData = useMemo(() => {
    const low = marketData.filter((i) => i.competition === "low").length;
    const medium = marketData.filter((i) => i.competition === "medium").length;
    const high = marketData.filter((i) => i.competition === "high").length;
    return [
      { name: "منافسة قليلة", value: low, color: "#00ff88" },
      { name: "منافسة متوسطة", value: medium, color: "#ffd700" },
      { name: "منافسة شرسة", value: high, color: "#ff6b6b" },
    ];
  }, [marketData]);

  const radarData = useMemo(() => {
    const categoryMap: Record<string, number[]> = {};
    marketData.forEach((item) => {
      if (!categoryMap[item.category]) categoryMap[item.category] = [];
      categoryMap[item.category].push(item.profitability);
    });
    return Object.entries(categoryMap).map(([cat, vals]) => ({
      category: cat,
      avgProfit: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
  }, [marketData]);

  const TICK_STYLE = { fill: "#70d0ff", fontFamily: "monospace", fontSize: 10 };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.1) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#0a1628" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="700" fontFamily="monospace">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const aiRows = [
    { key: "gemini", label: "Gemini 💎", data: aiMetrics.engines.gemini },
    { key: "claude", label: "Claude 🟣", data: aiMetrics.engines.claude },
    { key: "openai", label: "OpenAI 🟢", data: aiMetrics.engines.openai },
    { key: "local", label: "Local ⚙️", data: aiMetrics.engines.local },
  ];

  if (selectedTrendForGeneration) {
    return (
      <div className="animate-fade-in space-y-5">
        <button
          onClick={() => setSelectedTrendForGeneration(null)}
          className="bg-card border-2 border-primary text-primary px-4 py-2 rounded-md text-xs font-mono font-bold hover:bg-primary/10 transition-all flex items-center gap-2 box-glow"
        >
          <span>←</span> العودة للوحة القيادة
        </button>
        <OneClickOpportunity
          trend={selectedTrendForGeneration}
          onClose={() => setSelectedTrendForGeneration(null)}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-card border-2 border-primary rounded-lg p-4 box-glow">
        <div>
          <h2 className="text-lg font-bold text-primary font-mono">لوحة القيادة</h2>
          <p className="text-xs text-secondary font-mono mt-1">يتم تحديث البيانات محلياً كل 15 ثانية</p>
        </div>
        <button
          onClick={handleRefreshTrends}
          disabled={refreshing}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-md font-mono text-xs font-semibold hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? "⏳ جاري التحديث..." : "🔄 تحديث حي من الإنترنت"}
        </button>
        <button
          onClick={() => {
            const count = clearAllCache();
            setMarketData(initialMarketData);
            toast.success(`🗑️ تم مسح ${count} عنصر مخبأ!`);
          }}
          className="bg-card border-2 border-destructive/50 text-destructive px-3 py-2 rounded-md font-mono text-xs font-semibold hover:bg-destructive/10 transition-all"
        >
          🗑️ مسح الكاش
        </button>
      </div>

      <DailyFeed marketData={marketData} onSelectTrend={setSelectedTrendForGeneration} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { value: topTrend.topic, label: "أكثر موضوع بحثاً", size: "text-sm", icon: "🔥" },
          { value: goldOpportunities, label: "فرص ذهبية", size: "text-2xl", icon: "⭐" },
          { value: `${avgProfit}%`, label: "متوسط الربحية", size: "text-2xl", icon: "💰" },
          { value: season, label: "الموسم الحالي", size: "text-lg", icon: "📅" },
          { value: `${marketData.length}`, label: "تراندات مرصودة", size: "text-2xl", icon: "🎯" },
        ].map((stat, i) => (
          <div key={i} className={`border-2 rounded-lg p-4 text-center box-glow ${i === 4 ? "bg-destructive/5 border-destructive" : "bg-primary/5 border-primary"}`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`font-extrabold text-glow ${stat.size} ${i === 4 ? "text-destructive" : "text-primary"}`}>{stat.value}</div>
            <div className="text-xs text-secondary mt-1 font-mono">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar: Top searches */}
        <div className="lg:col-span-2 bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">📊 أكثر المواضيع بحثاً</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 8, left: -20, bottom: 50 }}>
              <XAxis
                dataKey="name"
                tick={TICK_STYLE}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis tick={TICK_STYLE} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="searches" name="عمليات البحث" fill="hsl(150 100% 50% / 0.8)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Demand */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">🎯 توزيع الطلب</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={65}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 font-mono text-[10px] text-secondary">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                {d.name}: <span className="font-semibold" style={{ color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Radar: Category profitability */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">📡 ربحية الفئات</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%">
              <PolarGrid stroke="hsl(150 100% 50% / 0.15)" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#70d0ff", fontSize: 9, fontFamily: "monospace" }} />
              <PolarRadiusAxis tick={{ fill: "#70d0ff", fontSize: 8 }} domain={[0, 100]} />
              <Radar
                name="متوسط الربحية"
                dataKey="avgProfit"
                stroke="hsl(150 100% 50%)"
                fill="hsl(150 100% 50% / 0.15)"
                strokeWidth={1.5}
              />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Profitability */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">💹 الربحية %</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={TICK_STYLE} unit="%" />
              <YAxis dataKey="name" type="category" tick={TICK_STYLE} width={70} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="profit" name="الربحية" unit="%" fill="hsl(48 100% 50% / 0.8)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Competition */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">⚔️ توزيع المنافسة</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={compPieData}
                cx="50%" cy="50%"
                outerRadius={65}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {compPieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {compPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 font-mono text-[10px] text-secondary">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                {d.name}: <span className="font-semibold" style={{ color: d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top 10 list */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔥 أكثر 10 مواضيع بحثاً</h3>
          {top10.map((item, i) => {
            const isGold = item.demand === "high" && item.competition === "low";
            const barW = Math.round((item.searches / top10[0].searches) * 100);
            return (
              <div key={i} className="py-2 border-b border-primary/20">
                <div className="flex items-center justify-between text-secondary font-mono text-xs mb-1">
                  <span className="flex-1 truncate mr-2">
                    <span className="text-primary font-bold">{i + 1}.</span>{" "}
                    {item.topic}
                    {isGold ? (
                      <button onClick={() => setSelectedTrendForGeneration(item)} className="ml-2 text-accent text-[10px] bg-accent/20 px-2 py-0.5 rounded border border-accent/30 tracking-wide font-extrabold shadow-[0_0_8px_rgba(255,215,0,0.4)] inline-block hover:scale-[1.05] hover:bg-accent/40 transition-all">🔥 أنشئ 15 صورة</button>
                    ) : item.profitability > 80 ? (
                      <span className="ml-2 text-primary text-[9px] bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30 tracking-wide inline-block">⭐ ممتازة</span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-accent font-semibold bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 text-[10px]">Score: {item.profitability}</span>
                    <span className="text-primary font-semibold">{item.searches.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-1 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${barW}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Seasonal */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">📅 مؤشر الموسم</h3>
          {seasonalEvents.map((ev, i) => (
            <div key={i} className="p-3 mb-3 bg-primary/5 rounded-md border-r-[3px] border-primary hover:bg-primary/10 transition-all">
              <div className="text-primary font-semibold font-mono text-sm">{ev.event}
                <span className="text-secondary text-[10px] font-normal mr-2">({ev.month})</span>
              </div>
              <div className="text-secondary text-xs mt-1 font-mono">{ev.images}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily tip */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">💡 نصيحة اليوم</h3>
        <div className="bg-primary/5 rounded-md p-4 border border-primary/20">
          <p className="text-secondary text-sm leading-relaxed font-mono">{tip}</p>
        </div>
        <button
          onClick={newTip}
          className="mt-4 bg-card border-2 border-primary text-primary px-5 py-2 rounded-md text-xs font-mono font-semibold hover:bg-primary/10 hover:box-glow transition-all"
        >
          🎲 نصيحة جديدة
        </button>
      </div>

      {/* AI performance pulse */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-accent text-glow-gold font-mono">📡 AI Performance Pulse</h3>
          <span className="text-[10px] font-mono text-secondary">تحديث حي من جلسة اليوم</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-accent/10 border border-accent/30 rounded-md p-3">
            <div className="text-[10px] text-secondary font-mono">إجمالي العمليات</div>
            <div className="text-xl font-extrabold text-accent font-mono">
              {aiMetrics.total.success + aiMetrics.total.failure}
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-md p-3">
            <div className="text-[10px] text-secondary font-mono">نجاح</div>
            <div className="text-xl font-extrabold text-primary font-mono">{aiMetrics.total.success}</div>
          </div>
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
            <div className="text-[10px] text-secondary font-mono">فشل</div>
            <div className="text-xl font-extrabold text-destructive font-mono">{aiMetrics.total.failure}</div>
          </div>
          <div className="bg-card border border-primary/30 rounded-md p-3">
            <div className="text-[10px] text-secondary font-mono">معدل النجاح</div>
            <div className="text-xl font-extrabold text-primary font-mono">{calcSuccessRate(aiMetrics.total)}%</div>
          </div>
        </div>

        <div className="space-y-2">
          {aiRows.map((row) => (
            <div key={row.key} className="bg-background/40 border border-primary/20 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-primary font-mono text-xs font-semibold">{row.label}</span>
                <span className="text-[10px] font-mono text-secondary">
                  Success Rate: {calcSuccessRate(row.data)}%
                </span>
              </div>
              <div className="mt-2 text-[10px] font-mono text-secondary">
                ✅ {row.data.success} نجاح • ❌ {row.data.failure} فشل
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔗 اختصارات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "📤 Adobe Stock Contributor", url: "https://stock.adobe.com/contributor" },
            { label: "📊 Google Trends", url: "https://trends.google.com" },
            { label: "📌 Pinterest Trends", url: "https://www.pinterest.com/trends/" },
            { label: "🎨 Behance", url: "https://www.behance.net" },
            { label: "🔍 EyeEm Market", url: "https://www.eyeem.com/market" },
            { label: "📈 Shutterstock", url: "https://www.shutterstock.com/contribute" },
            { label: "🌐 Freepik", url: "https://www.freepik.com/sell" },
            { label: "🤖 Anthropic Console", url: "https://console.anthropic.com" },
          ].map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="gradient-primary text-primary-foreground text-center py-2.5 px-2 rounded-md text-xs font-mono font-semibold box-glow-strong hover:scale-105 active:scale-95 transition-all no-underline block"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Live source pulse in dashboard */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🌐 نبض المصادر الآن</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sourcePulse.slice(0, 6).map((s) => (
            <div key={s.url} className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-primary font-mono text-xs font-semibold">{s.name}</span>
                <span className="text-secondary font-mono text-[10px]">{s.lastChecked}</span>
              </div>
              <p className="text-secondary font-mono text-[10px] mt-1">
                Topic: <span className="text-primary">{s.detectedTopic}</span>
              </p>
              <p className="text-secondary font-mono text-[10px] mt-1">
                Impact: <span className="text-accent">{s.impact}%</span> | Delta:{" "}
                <span className={s.delta >= 0 ? "text-primary" : "text-destructive"}>
                  {s.delta >= 0 ? "+" : ""}{s.delta}%
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* New ideas */}
        <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
          <h3 className="text-base font-semibold text-accent text-glow-gold mb-4 font-mono">🧠 أفكار مبتكرة</h3>
          <div className="space-y-2">
            {ideas.map((idea, idx) => (
              <div key={idx} className="bg-accent/5 border border-accent/20 rounded-md p-3 text-secondary font-mono text-xs">
                {idea}
              </div>
            ))}
          </div>
        </div>

        {/* Crystal Ball Radar */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 scanline-animation pointer-events-none" />
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono relative z-10">🔮 رادار التراندات القادمة (Trend Radar)</h3>
          <div className="space-y-3 relative z-10">
            {(trendRadar.length > 0 ? trendRadar : [
              { topic: "جاري تحميل التراندات...", time: "--", prob: "--" },
            ]).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background/50 border border-primary/20 rounded-md hover:bg-primary/10 transition-colors">
                <div>
                  <div className="text-primary text-xs font-mono font-bold animate-pulse-slow">{t.topic}</div>
                  <div className="text-secondary text-[10px] font-mono mt-1">{t.time}</div>
                </div>
                <div className="text-accent text-xs font-mono font-bold bg-accent/20 px-2 py-1 rounded border border-accent/30 tracking-wider shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                  {t.prob}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
