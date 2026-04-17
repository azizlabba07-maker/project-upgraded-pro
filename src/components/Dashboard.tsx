import { useState, useEffect, useMemo } from "react";
import { marketData as initialMarketData, dailyTips, seasonalEvents, type MarketTrend } from "@/data/marketData";
import { EMERGING_TRENDS_2026 } from "@/data/trends2026";
import { createSourcePulse, pulseLocalTrends } from "@/lib/livePulse";
import { generateAITrends, hasAnyApiKey, getUnifiedMarketOracle, type MarketOracleItem } from "@/lib/gemini";
import { clearAllCache } from "@/lib/sanitizer";
import { toast } from "sonner";
import { calcSuccessRate, getTodayAiMetrics } from "@/lib/aiMetrics";
import { formatNumber } from "@/lib/shared";
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
  const [oracleData, setOracleData] = useState<MarketOracleItem[]>([]);
  const [oracleLoading, setOracleLoading] = useState(false);

  const goldOpportunities = useMemo(() => marketData.filter((i) => i.demand === "high" && i.competition === "low").length, [marketData]);
  const avgProfit = useMemo(() => Math.round(marketData.reduce((s, i) => s + i.profitability, 0) / (marketData.length || 1)), [marketData]);
  const rareNiches = useMemo(() => marketData.filter((i) => i.profitability >= 90).length, [marketData]);
  const topTrend = useMemo(() => marketData.length > 0 ? marketData.reduce((max, i) => (i.searches > max.searches ? i : max)) : { topic: "" }, [marketData]);
  
  const isLive = marketData !== initialMarketData;
  const isCached = hasAnyApiKey() && isLive;
  
  const dataSourceBadge = (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
      isCached ? "bg-primary/10 text-primary border-primary/30" : 
      isLive ? "bg-accent/10 text-accent border-accent/30" : 
      "bg-secondary/10 text-secondary border-secondary/30"
    }`}>
      <span className={`w-1 h-1 rounded-full animate-pulse ${isLive ? "bg-primary" : "bg-secondary"}`} />
      {isCached ? "AI Live Data" : isLive ? "Live Stream" : "Base Engine"}
    </div>
  );

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

    const loadOracle = async () => {
      if (hasAnyApiKey()) {
        setOracleLoading(true);
        try {
          const data = await getUnifiedMarketOracle();
          setOracleData(data);
        } catch (e) {
          console.warn("Oracle failed to load", e);
        } finally {
          setOracleLoading(false);
        }
      }
    };

    loadRealData();
    loadOracle();
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
      
      // Update Oracle too
      setOracleLoading(true);
      const oracle = await getUnifiedMarketOracle();
      setOracleData(oracle);
      setOracleLoading(false);
    } catch (err: any) {
      toast.error(err.message ? `خطأ: ${err.message}` : "تعذر التحديث بالذكاء الاصطناعي.");
    } finally {
      setRefreshing(false);
      setOracleLoading(false);
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-primary font-mono tracking-tight bg-clip-text text-transparent gradient-primary">تحليلات السوق الذكية</h2>
            {dataSourceBadge}
          </div>
          <p className="text-[10px] text-secondary font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-ping" />
            تحديث حي: {new Date().toLocaleTimeString()} • 2025-2026 Forecast
          </p>
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
          { value: goldOpportunities, label: "فرص ذهبية (فريدة)", size: "text-3xl", icon: "💎", glow: "box-glow-gold", border: "border-accent/40" },
          { value: season, label: "تركيز الموسم", size: "text-lg", icon: "🗓️", glow: "box-glow", border: "border-primary/30" },
          { value: `${avgProfit}%`, label: "متوسط الربحية", size: "text-3xl", icon: "💹", glow: "box-glow", border: "border-primary/30" },
          { value: rareNiches, label: "نيشات نادرة (High ROI)", size: "text-3xl", icon: "🚀", glow: "box-glow-strong", border: "border-primary/50" },
          { value: topTrend.topic, label: "أعلى طلب يومي", size: "text-[11px] leading-tight", icon: "🔥", glow: "box-glow", border: "border-primary/30" },
        ].map((stat, i) => (
          <div key={i} className={`glass-morphism border-2 rounded-xl p-4 text-center transition-transform hover:scale-[1.02] ${stat.glow} ${stat.border}`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`font-black tracking-tighter ${stat.size} text-primary truncate px-1`}>{stat.value}</div>
            <div className="text-[10px] text-secondary mt-2 font-mono font-bold uppercase tracking-widest opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar: Top searches */}
        <div className="lg:col-span-2 glass-morphism border-2 border-primary/20 rounded-xl p-5 box-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-primary font-mono uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              مؤشر الطلب مقابل الربحية (Top 10)
            </h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-secondary">
                <div className="w-2 h-2 rounded-full bg-primary/80" /> عمليات البحث
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-secondary">
                <div className="w-2 h-2 rounded-full bg-accent/80" /> الربحية %
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: -25, bottom: 40 }}>
              <XAxis
                dataKey="name"
                tick={TICK_STYLE}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis yAxisId="left" tick={TICK_STYLE} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={TICK_STYLE} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="left" dataKey="searches" name="البحث" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="profit" name="الربحية" fill="url(#profitGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd700" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#ffd700" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Market Oracle - Unified Predictive System */}
        <div className="lg:col-span-2 bg-card border-2 border-primary rounded-lg p-5 box-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 scanline-animation pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-base font-bold text-primary font-mono flex items-center gap-2">
              <span>🔮</span> أوراكل السوق الموحد (Market Oracle)
            </h3>
            {oracleLoading && <span className="animate-spin text-primary text-xs">⚙️</span>}
          </div>
          
          <div className="space-y-3 relative z-10">
            {oracleData.length > 0 ? (
              oracleData.map((item, i) => (
                <div 
                  key={i} 
                  className={`border-r-[4px] p-3 rounded-md bg-background/40 hover:bg-primary/10 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    item.timeframe === "now" ? "border-primary" : item.timeframe === "soon" ? "border-accent" : "border-indigo-400"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary uppercase font-mono">{item.topic}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        item.timeframe === "now" ? "bg-primary/20 text-primary" : item.timeframe === "soon" ? "bg-accent/20 text-accent" : "bg-indigo-400/20 text-indigo-300"
                      }`}>
                        {item.timeframe === "now" ? "الآن 🔥" : item.timeframe === "soon" ? "قريباً ⏳" : "موسمي 📅"}
                      </span>
                      <span className="text-secondary text-[10px] font-mono opacity-60">Peak in {item.daysToPeak}d</span>
                    </div>
                    <div className="text-secondary text-[10px] leading-relaxed font-mono flex items-center gap-1.5 line-clamp-1">
                      <span className="text-accent underline decoration-accent/30 decoration-dashed underline-offset-2">إشارة:</span> 
                      {item.strategy}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-[9px] text-secondary font-mono mb-0.5 uppercase">Prob.</div>
                      <div className="text-sm font-bold text-primary font-mono">{item.probability}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-secondary font-mono mb-0.5 uppercase">Diff.</div>
                      <div className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                        item.difficulty === "easy" ? "text-primary border-primary/30" : item.difficulty === "medium" ? "text-accent border-accent/30" : "text-destructive border-destructive/30"
                      }`}>
                        {item.difficulty.toUpperCase()}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedTrendForGeneration({ topic: item.topic, category: item.category, demand: item.demand as any, competition: item.competition as any, profitability: item.probability, searches: 0 })}
                      className="bg-primary/10 border border-primary/40 text-primary px-3 py-1.5 rounded text-[10px] font-bold hover:bg-primary/20 transition-all box-glow font-mono uppercase"
                    >
                      الاقتناص
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-secondary font-mono text-xs italic">
                {oracleLoading ? "جاري استشارة الأوراكل..." : "أضف مفتاح API لتفعيل الرؤية التنبؤية ⚙️"}
              </div>
            )}
          </div>
        </div>

        {/* Top 10 list */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔥 أكثر 10 مواضيع بحثاً</h3>
          <div className="space-y-1.5">
            {top10.map((item, i) => {
              const isGold = item.demand === "high" && item.competition === "low";
              const barW = Math.round((item.searches / (top10[0]?.searches || 1)) * 100);
              return (
                <div key={i} className="py-1.5 border-b border-primary/10">
                  <div className="flex items-center justify-between text-secondary font-mono text-[11px] mb-1">
                    <span className="flex-1 truncate mr-2">
                      <span className="text-primary font-bold">{i + 1}.</span>{" "}
                      {item.topic}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isGold && <span className="text-[9px] bg-accent/20 text-accent px-1 rounded font-bold">GOLD</span>}
                      <span className="text-primary font-bold">{formatNumber(item.searches)}</span>
                    </div>
                  </div>
                  <div className="h-0.5 bg-primary/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full transition-all"
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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

      <div className="mt-8 border-t border-primary/10 pt-6 pb-2 text-center opacity-60">
        <p className="text-[10px] font-mono text-secondary leading-relaxed">
          جميع البيانات يتم استخلاصها ومطابقتها عبر Oracle AI لعام 2025-2026.<br />
          تعتمد دقة التوقعات على Adobe Stock Analytics و Google Trends Live Pulse.<br />
          <span className="text-primary/60">Adobe Stock Batch Pro © 2026 • Premium Market Intelligence</span>
        </p>
      </div>
    </div>
  );
}
