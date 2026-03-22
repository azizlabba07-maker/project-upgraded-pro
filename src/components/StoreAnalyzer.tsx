import { useState } from "react";
import { analyzeRejectionOrLowSales, hasAnyApiKey, classifyGeminiError, getGeminiErrorUserMessage } from "@/lib/gemini";
import { toast } from "sonner";

export default function StoreAnalyzer() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const keywords = keywordsRaw
    .split(/[,\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  const handleAnalyze = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (!title.trim() && !description.trim() && keywords.length === 0) {
      toast.error("أدخل على الأقل العنوان أو الوصف أو الكلمات المفتاحية");
      return;
    }
    setLoading(true);
    setAnalysis("");
    try {
      const result = await analyzeRejectionOrLowSales(
        title.trim() || "(غير محدد)",
        description.trim() || "(غير محدد)",
        keywords,
        rejectionReason.trim() || undefined
      );
      setAnalysis(result);
      toast.success("✅ تم التحليل بنجاح!");
    } catch (error) {
      const errType = classifyGeminiError(error);
      toast.error(getGeminiErrorUserMessage(error));
      if (errType === "quota" || errType === "rate_limit") return;
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";
  const labelClass = "text-primary text-xs font-semibold font-mono block mb-1.5";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-2 font-mono">
          🔍 محلل الرفض وقلة المبيعات
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-4">
          الصق محتوى الصورة/الفيديو المرفوض أو منخفض المبيعات. سيحلل الذكاء الاصطناعي الأسباب ويقترح تحسينات للعنوان والوصف والكلمات المفتاحية.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>العنوان (Title):</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: Professional chef cooking in modern kitchen"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>الوصف (Description):</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المحتوى..."
              className={`${inputClass} min-h-[80px]`}
              rows={3}
            />
          </div>
          <div>
            <label className={labelClass}>الكلمات المفتاحية (مفصولة بفاصلة أو سطر جديد):</label>
            <textarea
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              placeholder="chef, cooking, kitchen, food, professional..."
              className={`${inputClass} min-h-[70px]`}
              rows={3}
            />
          </div>
          <div>
            <label className={labelClass}>سبب الرفض (إن وُجد):</label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: Property release required, Trademark..."
              className={inputClass}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? "⏳ جاري التحليل..." : "🧠 حلل وأقترح تحسينات"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow animate-fade-in">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">
            📋 نتيجة التحليل
          </h3>
          <div className="text-secondary font-arabic text-sm leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        </div>
      )}

      {!hasAnyApiKey() && (
        <p className="text-destructive font-mono text-xs text-center">
          ⚠️ أضف مفتاح Gemini API من الإعدادات ⚙️ لاستخدام المحلل
        </p>
      )}
    </div>
  );
}
