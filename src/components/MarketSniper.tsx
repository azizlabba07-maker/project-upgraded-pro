// src/components/MarketSniper.tsx
import { useState, useMemo, useEffect } from "react";
import { type MarketTrend } from "@/data/marketData";
import { hasAnyApiKey } from "@/lib/gemini";
import { hasClaudeKey } from "@/lib/claude";
import { hasOpenAIKey } from "@/lib/openai";
import { dispatchPromptGeneration } from "@/lib/aiDispatcher";
import { toast } from "sonner";
import { StatsService } from "@/lib/StatsService";

interface SniperPackage {
  trend: MarketTrend;
  title: string;
  keywords: string[];
  prompt: string;
  optimizedPrompt: string;
  notes: string;
  category: string;
}

export default function MarketSniper({ liveMarketData }: { liveMarketData?: MarketTrend[] }) {
  const [packages, setPackages] = useState<SniperPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sniperCount, setSniperCount] = useState(0);
  const [realTrends, setRealTrends] = useState<MarketTrend[]>([]);
  const [isDataReal, setIsDataReal] = useState(false);

  // Load deterministic trends from StatsService
  useEffect(() => {
    if (liveMarketData && liveMarketData.length > 0) {
      setRealTrends(liveMarketData);
      setIsDataReal(true);
      return;
    }
    const loadReal = async () => {
      try {
        const data = await StatsService.fetchMarketData();
        setRealTrends(data);
        setIsDataReal(true);
      } catch (e) {
        toast.error("فشل تحميل بيانات السوق للقناص.");
      }
    };
    loadReal();
  }, [liveMarketData]);

  // Use centralized scoring and golden target logic from StatsService
  const goldenTargets = useMemo(() => {
    return StatsService.getGoldenTargets(realTrends);
  }, [realTrends]);

  const handleSnipe = async () => {
    const hasAnyKey = hasAnyApiKey() || hasClaudeKey() || hasOpenAIKey();
    if (!hasAnyKey) {
      toast.error("أضف مفتاح API من الإعدادات ⚙️");
      return;
    }

    setLoading(true);
    setPackages([]);
    const results: SniperPackage[] = [];
    let targetsToUse = goldenTargets;

    try {
      if (!isDataReal || targetsToUse.length === 0) {
        toast.info("🔍 جاري جلب أحدث بيانات السوق...");
        const data = await StatsService.fetchMarketData();
        setRealTrends(data);
        setIsDataReal(true);
        targetsToUse = StatsService.getGoldenTargets(data);
        
        if (targetsToUse.length === 0) {
           toast.error("لا توجد فرص ذهبية واضحة حالياً. جرب توسيع الفلاتر أو المحاولة لاحقاً.");
           setLoading(false);
           return;
        }
      }

      // Max 5 targets per snipe run
      for (const target of targetsToUse.slice(0, 5)) {
        toast.info(`🎯 قنص: ${target.topic}...`);

        const { prompts } = await dispatchPromptGeneration(
          target.category,
          1,
          "image",
          ["Clean Backgrounds", "Minimalism", "Commercial Appeal"],
          "low",
          target.topic
        );

        const rawPrompt = prompts[0]?.prompt || `Professional ${target.topic} concept, 4K, commercial appeal`;
        const score = StatsService.getTrendScore(target);

        results.push({
          trend: target,
          title: (prompts[0]?.title || `${target.topic} Stock Concept`).slice(0, 70),
          keywords: (prompts[0]?.keywords || []).slice(0, 49),
          prompt: rawPrompt,
          optimizedPrompt: rawPrompt,
          notes: `Opportunity Score: ${score}/100 | Demand: ${target.demand} | Competition: ${target.competition}`,
          category: target.category,
        });
      }

      setPackages(results);
      setSniperCount((c) => c + results.length);
      toast.success(`🎯 تم قنص ${results.length} فرص بنجاح!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء القنص");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (packages.length === 0) return;
    const headers = ["Filename", "Title", "Keywords", "Category", "Releases"];
    const rows = packages.map((p, i) => [
      `sniper_${i + 1}_${p.category.toLowerCase().replace(/\s+/g, "_")}`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.keywords.join(", ").replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `""`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-sniper-export.csv`;
    a.click();
    toast.success("📥 تم تصدير CSV بنجاح!");
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-card border-2 border-destructive rounded-lg p-5 box-glow relative overflow-hidden">
        <div className="absolute inset-0 bg-destructive/5 scanline-animation pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-destructive font-mono flex items-center gap-2">🎯 وضع قناص السوق</h3>
            {sniperCount > 0 && <span className="text-[10px] font-mono text-accent bg-accent/15 px-2 py-1 rounded">🏆 قنص: {sniperCount}</span>}
          </div>
          <p className="text-secondary font-mono text-[11px] mb-4">يستهدف تلقائياً النيشات الأكثر ربحية والأقل منافسة في السوق الحي.</p>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              <div className="text-[10px] text-secondary font-mono">أهداف مرصودة</div>
              <div className="text-lg font-extrabold text-destructive font-mono">{goldenTargets.length}</div>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-md px-3 py-2">
              <div className="text-[10px] text-secondary font-mono">أعلى Score</div>
              <div className="text-lg font-extrabold text-primary font-mono">{goldenTargets.length > 0 ? StatsService.getTrendScore(goldenTargets[0]) : 0}/100</div>
            </div>
          </div>

          <button onClick={handleSnipe} disabled={loading} className="w-full bg-destructive text-destructive-foreground py-3 rounded-md font-mono text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-destructive/20">
            {loading ? "⏳ جاري القنص الذكي..." : "🎯 أطلق النار! (Snipe & Generate)"}
          </button>
        </div>
      </div>

      {goldenTargets.length > 0 && (
        <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
          <h3 className="text-sm font-semibold text-accent mb-3 font-mono">⭐ أهداف مرصودة حالياً</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {goldenTargets.map((t, i) => (
              <div key={i} className="bg-accent/5 border border-accent/20 rounded-md p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-primary text-xs font-mono font-semibold">{t.topic}</div>
                  <div className="text-secondary text-[10px] font-mono">{t.category}</div>
                </div>
                <span className="text-accent text-xs font-mono font-bold">{StatsService.getTrendScore(t)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {packages.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-primary font-mono">📦 الحزم المولدة ({packages.length})</h3>
            <button onClick={exportCSV} className="gradient-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-mono font-semibold">📥 تصدير CSV</button>
          </div>
          {packages.map((pkg, i) => (
            <div key={i} className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
              <div className="flex justify-between mb-3">
                <h4 className="text-primary font-mono text-sm font-bold">{pkg.title}</h4>
                <span className="text-accent text-xs font-mono font-bold">#{i + 1}</span>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded p-3 text-secondary font-mono text-xs mb-3">{pkg.optimizedPrompt}</div>
              <div className="flex gap-2">
                <button onClick={() => copyPrompt(pkg.optimizedPrompt)} className="px-2.5 py-1 text-[10px] font-mono border border-primary/40 text-primary rounded">📋 نسخ البرومبت</button>
                <button onClick={() => copyPrompt(pkg.keywords.join(", "))} className="px-2.5 py-1 text-[10px] font-mono border border-primary/40 text-primary rounded">🔑 نسخ الكلمات</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

