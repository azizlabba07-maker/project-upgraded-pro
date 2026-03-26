import { useState, useEffect } from "react";
import { runOpportunityPipeline, type OpportunityEngineResult } from "@/lib/opportunityEngine";
import { hasAnyApiKey, getGeminiErrorUserMessage } from "@/lib/gemini";
import { toast } from "sonner";
import { categories } from "@/data/marketData";
import MarketSniper from "@/components/MarketSniper";

export default function OpportunityEngine() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Technology");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OpportunityEngineResult | null>(null);
  const [step, setStep] = useState(0); // 0: Idle, 1: Intent, 2: Score, 3: Mutating, 4: Done

  const runEngine = async () => {
    if (!topic.trim()) {
      toast.error("يرجى إدخال مجال أو فكرة للبحث عنها.");
      return;
    }
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }

    setLoading(true);
    setResult(null);
    setStep(1); // Start pipeline UI

    // Fake pipeline progress for UI UX (The actual call happens concurrently)
    const timers = [
      setTimeout(() => setStep(2), 2500),
      setTimeout(() => setStep(3), 5000)
    ];

    try {
      const data = await runOpportunityPipeline(topic, category);
      timers.forEach(clearTimeout);
      setStep(4);
      setResult(data);
      toast.success("🎯 تم صيد الفرصة بنجاح!");
    } catch (error) {
      timers.forEach(clearTimeout);
      setStep(0);
      toast.error(getGeminiErrorUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ بنجاح!");
  };

  const inputClass = "bg-card border-2 border-primary text-primary p-3 rounded-md font-mono text-sm focus:outline-none focus:box-glow-strong w-full";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Info */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/5 scanline-animation pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
          <div className="text-5xl">🧠</div>
          <div>
            <h2 className="text-xl font-bold text-accent font-mono mb-1 text-glow-gold">محرك الفرص (Opportunity Engine)</h2>
            <p className="text-secondary font-mono text-xs leading-relaxed">
              نظام متكامل يحلل السوق، يكتشف نية البحث (Intent)، يحسب قوة المنافسة، ويولد لك Prompts حصرية بتعديلات جينية (Mutations) لضمان انفرادك في سوق Adobe Stock.
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">1. أَدْخِل فكرة أو مجالاً لاكتشافه</h3>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="text-primary text-xs font-semibold font-mono block mb-2">الفكرة / الموضوع (مثال: Ramadan Backgrounds)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runEngine()}
              placeholder="اكتب فكرة عامة لتبدأ..."
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div className="w-full md:w-1/3">
            <label className="text-primary text-xs font-semibold font-mono block mb-2">الفئة (Category)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              {categories.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={runEngine}
          disabled={loading}
          className="w-full gradient-primary text-primary-foreground py-3.5 rounded-md font-mono text-sm font-bold box-glow-strong hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {loading ? "⚙️ جاري معالجة البيانات وبناء الفرصة..." : "🚀 تشغيل المحرك (Run Pipeline)"}
        </button>
      </div>

      {/* Pipeline Visualizer */}
      {loading && (
        <div className="bg-card border-2 border-primary rounded-lg p-6 box-glow grid grid-cols-1 md:grid-cols-3 gap-4 text-center mt-5 relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-primary/20 -translate-y-1/2 hidden md:block z-0" />
          
          <div className={`relative z-10 p-4 rounded-lg transition-all duration-500 ${step >= 1 ? 'bg-primary/20 border-2 border-primary box-glow scale-105' : 'bg-background/50 border border-primary/20 grayscale opacity-50'}`}>
            <div className="text-3xl mb-2">{step === 1 ? '⏳' : '✅'}</div>
            <div className="font-mono text-xs font-bold text-primary mb-1">استخراج الأسئلة</div>
            <div className="text-[10px] text-secondary font-mono">تحليل نية البحث الحقيقية</div>
          </div>
          
          <div className={`relative z-10 p-4 rounded-lg transition-all duration-500 delay-100 ${step >= 2 ? 'bg-cyber-yellow/20 border-2 border-cyber-yellow box-glow scale-105' : 'bg-background/50 border border-primary/20 grayscale opacity-50'}`}>
            <div className="text-3xl mb-2">{step === 2 ? '⏳' : step > 2 ? '✅' : '🔒'}</div>
            <div className="font-mono text-xs font-bold text-cyber-yellow mb-1">حساب المنافسة والفرصة</div>
            <div className="text-[10px] text-secondary font-mono">Scoring Matrix Analyst</div>
          </div>
          
          <div className={`relative z-10 p-4 rounded-lg transition-all duration-500 delay-200 ${step >= 3 ? 'bg-accent/20 border-2 border-accent box-glow-gold scale-105' : 'bg-background/50 border border-primary/20 grayscale opacity-50'}`}>
            <div className="text-3xl mb-2">{step === 3 ? '🧪' : step > 3 ? '✅' : '🔒'}</div>
            <div className="font-mono text-xs font-bold text-accent mb-1">التحول الجيني للبرومبت</div>
            <div className="text-[10px] text-secondary font-mono">Mutation Engine</div>
          </div>
        </div>
      )}

      {/* Final Results */}
      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          
          {/* Analysis Column */}
          <div className="space-y-5">
            {/* Score Card */}
            <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold flex flex-col items-center justify-center text-center">
              <div className="text-secondary font-mono text-xs mb-2">⭐ Opportunity Score</div>
              <div className="text-6xl font-extrabold text-accent font-mono text-glow-gold mb-2">
                {result.opportunityScore}
              </div>
              <div className="flex gap-4 mt-2">
                <div className="bg-background/50 border border-accent/20 px-3 py-1.5 rounded text-[10px] font-mono whitespace-nowrap">
                  الطلب: <span className="text-accent font-bold uppercase">{result.demandEstimate}</span>
                </div>
                <div className="bg-background/50 border border-accent/20 px-3 py-1.5 rounded text-[10px] font-mono whitespace-nowrap">
                  المنافسة: <span className="text-accent font-bold uppercase">{result.competitionEstimate}</span>
                </div>
              </div>
            </div>

            {/* Top Questions */}
            <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
              <h4 className="text-primary font-mono text-sm font-bold mb-3 flex items-center gap-2">
                <span>💭</span> النية الخفية للسوق
              </h4>
              <ul className="space-y-2">
                {result.questions.map((q, i) => (
                  <li key={i} className="text-secondary font-mono text-[11px] bg-primary/5 p-2 rounded border border-primary/10">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prompt Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow flex flex-col h-full">
              
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-accent font-mono text-base font-bold flex items-center gap-2 text-glow-gold">
                  <span>✨</span> برومبت المحرك الذهبي
                </h4>
                <button
                  onClick={() => copyText(result.optimizedPrompt)}
                  className="bg-card border border-primary text-primary px-3 py-1 rounded text-xs font-mono font-bold hover:bg-primary/20 transition-all box-glow"
                >
                  نسخ البرومبت 📋
                </button>
              </div>
              
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4 text-secondary font-mono text-sm leading-relaxed mb-5">
                {result.optimizedPrompt}
              </div>

              <div className="flex justify-between items-end mt-auto gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                   <h5 className="text-primary font-mono text-xs font-bold mb-2">العنوان الأمثل (SEO Title):</h5>
                   <div className="bg-background/80 border border-primary/30 rounded p-2 text-primary font-mono text-xs truncate" title={result.title}>
                     {result.title}
                   </div>
                </div>
                <button
                  onClick={() => copyText(result.title)}
                  className="bg-primary/10 border border-primary/50 text-primary px-3 py-2 rounded text-[10px] font-mono font-bold hover:bg-primary/20 transition-all whitespace-nowrap"
                >
                  نسخ العنوان
                </button>
              </div>
            </div>
          </div>
          
          {/* Keywords row spanning full width */}
          <div className="lg:col-span-3 bg-card border-2 border-primary rounded-lg p-5 box-glow">
             <div className="flex justify-between items-center mb-3">
                <h4 className="text-primary font-mono text-sm font-bold flex items-center gap-2">
                  <span>🔑</span> الكلمات المفتاحية ({result.keywords.length})
                </h4>
                <button
                  onClick={() => copyText(result.keywords.join(", "))}
                  className="bg-card border border-primary text-primary px-3 py-1 rounded text-[10px] font-mono font-bold hover:bg-primary/20 transition-all box-glow"
                >
                  نسخ الكلمات 📋
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((kw, i) => (
                  <span key={i} className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-secondary px-2 py-1 rounded">
                    {kw}
                  </span>
                ))}
              </div>
          </div>

        </div>
      )}

      {/* Market Sniper — Collapsible */}
      <details className="group mt-8">
        <summary className="cursor-pointer bg-destructive/10 border-2 border-destructive rounded-lg p-4 box-glow flex items-center justify-between hover:bg-destructive/15 transition-all list-none">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="text-base font-semibold text-destructive font-mono">قناص السوق (Market Sniper)</h3>
              <p className="text-secondary font-mono text-[10px] mt-0.5">اقنص الفرص الذهبية وصدّر حزم CSV جاهزة للرفع على Adobe Stock</p>
            </div>
          </div>
          <span className="text-destructive text-sm font-mono group-open:rotate-90 transition-transform duration-200">▶</span>
        </summary>
        <div className="mt-3">
          <MarketSniper />
        </div>
      </details>
    </div>
  );
}
