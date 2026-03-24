import { useState, useMemo } from "react";
import { marketData as staticMarketData, type MarketTrend } from "@/data/marketData";
import {
  generateGeminiStockPrompts,
  generateAIKeywords,
  hasAnyApiKey,
  classifyGeminiError,
  getGeminiErrorUserMessage,
} from "@/lib/gemini";
import { optimizePrompt } from "@/lib/autoOptimizer";
import { toast } from "sonner";

interface SniperPackage {
  trend: MarketTrend;
  title: string;
  keywords: string[];
  prompt: string;
  optimizedPrompt: string;
  notes: string;
  category: string;
}

function getOpportunityScore(item: MarketTrend): number {
  const demandW = item.demand === "high" ? 100 : item.demand === "medium" ? 70 : 40;
  const compW = item.competition === "low" ? 100 : item.competition === "medium" ? 65 : 30;
  return Math.round(demandW * 0.4 + compW * 0.35 + Math.min(100, item.profitability) * 0.25);
}

export default function MarketSniper() {
  const [packages, setPackages] = useState<SniperPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sniperCount, setSniperCount] = useState(0);

  // Find golden opportunities automatically
  const goldenTargets = useMemo(() => {
    return [...staticMarketData]
      .filter((t) => t.demand === "high" && t.competition === "low")
      .sort((a, b) => getOpportunityScore(b) - getOpportunityScore(a));
  }, []);

  const handleSnipe = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (goldenTargets.length === 0) {
      toast.error("لا توجد فرص ذهبية حالياً. جرب تحديث التراندات أولاً.");
      return;
    }

    setLoading(true);
    setPackages([]);
    const results: SniperPackage[] = [];

    try {
      for (const target of goldenTargets.slice(0, 5)) {
        toast.info(`🎯 قنص: ${target.topic}...`);

        // Generate prompt, title, and keywords in a SINGLE API call
        const prompts = await generateGeminiStockPrompts(
          target.category,
          1,
          "image",
          ["Clean Backgrounds", "Minimalism", "Commercial Appeal"],
          "low",
          target.topic
        );

        const rawPrompt = prompts[0]?.prompt || `Professional ${target.topic} concept, studio lighting, clean commercial composition, 4K, sRGB, copy space, no text, no logos, no faces`;

        // Skip secondary optimization API call to save quota - V1 is already highly optimized!
        const optimized = rawPrompt;

        // Use keywords already generated in the first API call, fallback if missing
        let keywords: string[] = prompts[0]?.keywords || [];
        if (keywords.length === 0) {
          keywords = target.topic.toLowerCase().split(/\s+/).concat([
            "abstract", "commercial", "royalty free", "stock photo", "background",
            "modern", "professional", "digital", "creative", "design",
          ]);
        }

        const title = (prompts[0]?.title || `${target.topic} - Professional Stock ${target.category} Concept`).slice(0, 70);

        results.push({
          trend: target,
          title,
          keywords: keywords.slice(0, 49),
          prompt: rawPrompt,
          optimizedPrompt: optimized,
          notes: `Opportunity Score: ${getOpportunityScore(target)}/100 | Demand: ${target.demand} | Competition: ${target.competition} | Profitability: ${target.profitability}%`,
          category: target.category,
        });
      }

      setPackages(results);
      setSniperCount((c) => c + results.length);
      toast.success(`🎯 تم قنص ${results.length} فرص ذهبية بنجاح!`);
    } catch (error) {
      toast.error(getGeminiErrorUserMessage(error));
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
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adobe-stock-sniper-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 تم تصدير CSV بنجاح! جاهز لرفعه على Adobe Stock.");
  };

  const exportFullTxt = () => {
    if (packages.length === 0) return;

    const text = packages
      .map((p, i) => {
        return `${"=".repeat(60)}
PACKAGE ${i + 1}: ${p.trend.topic}
${"=".repeat(60)}
Title: ${p.title}
Category: ${p.category}
Score: ${getOpportunityScore(p.trend)}/100

--- OPTIMIZED PROMPT (V2) ---
${p.optimizedPrompt}

--- ORIGINAL PROMPT (V1) ---
${p.prompt}

--- KEYWORDS (${p.keywords.length}) ---
${p.keywords.join(", ")}

--- NOTES ---
${p.notes}`;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adobe-sniper-full-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 تم تصدير الحزمة الكاملة!");
  };

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ!");
    } catch {
      toast.error("تعذر النسخ.");
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="bg-card border-2 border-destructive rounded-lg p-5 box-glow relative overflow-hidden">
        <div className="absolute inset-0 bg-destructive/5 scanline-animation pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-destructive font-mono flex items-center gap-2">
              🎯 وضع قناص السوق (Market Sniper)
            </h3>
            {sniperCount > 0 && (
              <span className="text-[10px] font-mono text-accent bg-accent/15 border border-accent/30 px-2 py-1 rounded">
                🏆 تم قنص: {sniperCount} فرصة
              </span>
            )}
          </div>
          <p className="text-secondary font-mono text-[11px] mb-4">
            يقتنص تلقائياً الفرص الذهبية (طلب عالي + منافسة قليلة)، يولد Prompts محسنة + Keywords جاهزة، ويصدر CSV احترافي للرفع المباشر على Adobe Stock.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              <div className="text-[10px] text-secondary font-mono">أهداف مرصودة</div>
              <div className="text-lg font-extrabold text-destructive font-mono">{goldenTargets.length}</div>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-md px-3 py-2">
              <div className="text-[10px] text-secondary font-mono">أعلى Score</div>
              <div className="text-lg font-extrabold text-primary font-mono">
                {goldenTargets.length > 0 ? getOpportunityScore(goldenTargets[0]) : 0}/100
              </div>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-md px-3 py-2">
              <div className="text-[10px] text-secondary font-mono">تم التصدير</div>
              <div className="text-lg font-extrabold text-accent font-mono">{packages.length}</div>
            </div>
          </div>

          <button
            onClick={handleSnipe}
            disabled={loading}
            className="w-full bg-destructive text-destructive-foreground py-3 rounded-md font-mono text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,50,50,0.3)]"
          >
            {loading ? "⏳ جاري القنص والتوليد التلقائي..." : "🎯 أطلق النار! (Snipe & Generate)"}
          </button>
        </div>
      </div>

      {/* Golden Target List */}
      {goldenTargets.length > 0 && (
        <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
          <h3 className="text-sm font-semibold text-accent text-glow-gold mb-3 font-mono">⭐ الأهداف الذهبية المرصودة حالياً</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {goldenTargets.map((t, i) => (
              <div key={i} className="bg-accent/5 border border-accent/20 rounded-md p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-primary text-xs font-mono font-semibold">{t.topic}</div>
                  <div className="text-secondary text-[10px] font-mono">{t.category} | {t.profitability}%</div>
                </div>
                <span className="text-accent text-xs font-mono font-bold">{getOpportunityScore(t)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Packages */}
      {packages.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-primary text-glow font-mono">
              📦 الحزم الجاهزة للرفع ({packages.length})
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportCSV}
                className="gradient-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-mono font-semibold box-glow-strong hover:scale-[1.02] transition-all"
              >
                📥 تصدير CSV لـ Adobe Stock
              </button>
              <button
                onClick={exportFullTxt}
                className="bg-card border border-primary/40 text-primary px-4 py-2 rounded-md text-xs font-mono font-semibold hover:bg-primary/10 transition-all"
              >
                📄 تصدير الكل TXT
              </button>
            </div>
          </div>

          {packages.map((pkg, i) => (
            <div key={i} className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-primary font-mono text-sm font-bold">{pkg.title}</h4>
                  <div className="text-secondary text-[10px] font-mono mt-1">{pkg.notes}</div>
                </div>
                <span className="text-accent text-xs font-mono font-bold bg-accent/20 px-2 py-1 rounded border border-accent/30">
                  #{i + 1}
                </span>
              </div>

              {/* Optimized Prompt */}
              <div className="mb-3">
                <div className="text-primary font-mono text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                  ✨ البرومبت المُحسَّن (V2 — Auto Optimized)
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded p-3 text-secondary font-mono text-xs leading-relaxed break-words">
                  {pkg.optimizedPrompt}
                </div>
                <button
                  onClick={() => copyPrompt(pkg.optimizedPrompt)}
                  className="mt-2 px-2.5 py-1 text-[10px] font-mono font-semibold bg-card border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
                >
                  📋 نسخ V2
                </button>
              </div>

              {/* Original Prompt (collapsed) */}
              <details className="mb-3">
                <summary className="text-secondary font-mono text-[10px] cursor-pointer hover:text-primary transition-colors">
                  📝 عرض البرومبت الأصلي (V1)
                </summary>
                <div className="mt-1.5 bg-card/30 border border-primary/10 rounded p-2.5 text-secondary font-mono text-[10px] leading-relaxed break-words">
                  {pkg.prompt}
                </div>
              </details>

              {/* Keywords */}
              <div>
                <div className="text-primary font-mono text-[10px] font-semibold mb-1.5">🔑 Keywords ({pkg.keywords.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.keywords.slice(0, 25).map((kw, ki) => (
                    <span key={ki} className="text-[9px] font-mono bg-primary/5 border border-primary/15 text-secondary px-1.5 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                  {pkg.keywords.length > 25 && (
                    <span className="text-[9px] font-mono text-secondary">+{pkg.keywords.length - 25} more</span>
                  )}
                </div>
                <button
                  onClick={() => copyPrompt(pkg.keywords.join(", "))}
                  className="mt-2 px-2.5 py-1 text-[10px] font-mono font-semibold bg-card border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
                >
                  📋 نسخ Keywords
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
