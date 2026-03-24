import { useState } from "react";
import { analyzeTopSeller, hasAnyApiKey, classifyGeminiError, getGeminiErrorUserMessage, type TopSellerAnalysis } from "@/lib/gemini";
import { toast } from "sonner";

export default function CompetitorSpy() {
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<TopSellerAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (!title.trim() && !keywords.trim()) {
      toast.error("أدخل على الأقل عنوان العمل أو الكلمات المفتاحية للمنافس.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeTopSeller(title, keywords, notes);
      setAnalysis(result);
      toast.success("✅ تمت عملية التجسس والتطوير بنجاح!");
    } catch (error) {
      const errType = classifyGeminiError(error);
      toast.error(getGeminiErrorUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ البرومبت المطور!");
    } catch {
      toast.error("تعذر النسخ.");
    }
  };

  const inputClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";
  const labelClass = "text-primary text-xs font-semibold font-mono block mb-1.5";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 scanline-animation pointer-events-none" />
        <h3 className="text-base font-semibold text-primary text-glow mb-2 font-mono relative z-10">
          🕵️ جاسوس كبار البائعين (Competitor Spy)
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-4 relative z-10">
          اكتشف الخلطة السرية لأنجح الأعمال في Adobe Stock، و"اسرق" أفكار المنافسين ليتم تطويرها لنسخ أقوى وأكثر جاذبية للمبيعات.
        </p>

        <div className="space-y-4 relative z-10">
          <div>
            <label className={labelClass}>عنوان العمل المنافس (Title / Name):</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="الصق عنوان الصورة المتصدرة..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>الكلمات المفتاحية الملحوظة (إن وجدت):</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="الكلمات المفتاحية التي يبدو أن المنافس اعتمد عليها..."
              className={`${inputClass} min-h-[70px]`}
              rows={3}
            />
          </div>
          <div>
            <label className={labelClass}>ملاحظاتك (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: الإضاءة زرقاء، النمط 사이بربانك..."
              className={inputClass}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? "⏳ جاري التجسس واستخراج الأسرار..." : "🕵️ بدء التجسس والتطوير"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-5 animate-fade-in">
          {/* Secret Sauce */}
          <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
            <h3 className="text-sm font-semibold text-accent text-glow-gold mb-3 font-mono">🧪 الخلطة السرية لنجاح هذا العمل</h3>
            <p className="text-secondary font-arabic text-sm leading-relaxed">{analysis.secretSauce}</p>
          </div>

          {/* Hidden Keywords */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-sm font-semibold text-primary text-glow mb-3 font-mono">🔑 الكلمات المفتاحية الخفية (Hidden Keywords)</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.hiddenKeywords.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 text-xs font-mono bg-primary/10 border border-primary/30 text-primary rounded-md">
                  {kw}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis.hiddenKeywords.join(", "));
                toast.success("تم نسخ الكلمات المفتاحية!");
              }}
              className="mt-4 px-3 py-1.5 text-xs font-mono font-semibold bg-card border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
            >
              📋 نسخ الكلمات
            </button>
          </div>

          {/* Smart Evolutions */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">🚀 التطوير الذكي (أفكار مطوّرة لقتل المنافسة)</h3>
            <div className="space-y-4">
              {analysis.smartEvolutions.map((evo, i) => (
                <div key={i} className="bg-background/50 border border-primary/20 rounded-md p-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-primary font-bold text-sm font-arabic">{evo.title}</h4>
                    <button
                      onClick={() => copyPrompt(evo.prompt)}
                      className="px-2 py-1 text-[10px] font-mono font-semibold bg-card border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors shadow-sm"
                    >
                      📋 نسخ البرومبت
                    </button>
                  </div>
                  <p className="text-secondary text-xs font-arabic mb-3">{evo.concept}</p>
                  <div className="bg-card/40 border border-primary/10 rounded p-2.5 text-[10px] font-mono text-secondary break-words">
                    <span className="text-primary font-semibold mr-1">PROMPT:</span>
                    {evo.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
