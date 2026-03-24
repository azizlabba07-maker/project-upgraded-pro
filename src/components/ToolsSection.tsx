import { useEffect, useState } from "react";
import { checklistItems } from "@/data/marketData";
import { generateAIKeywords, getTopKeywordsForDomain, hasAnyApiKey, analyzeImageForStock, type ImageAnalysisResult } from "@/lib/gemini";
import { generateClaudeKeywords, hasClaudeKey } from "@/lib/claude";
import { trackAiMetric } from "@/lib/aiMetrics";
import { toast } from "sonner";

export default function ToolsSection() {
  const NOTES_STORAGE_KEY = "tools_notes_v1";
  const NOTES_ARCHIVE_STORAGE_KEY = "tools_notes_archive_v1";

  // ── Image Analyzer ──
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [imageResults, setImageResults] = useState<ImageAnalysisResult[]>([]);

  // ── Keywords ──
  const [keywordTopic, setKeywordTopic] = useState("");
  const [keywordCount, setKeywordCount] = useState(25);
  const [engine, setEngine]             = useState<"claude" | "gemini">("claude");
  const [keywords, setKeywords]         = useState<string[]>([]);
  const [loadingKw, setLoadingKw]       = useState(false);

  // ── Top Keywords per Domain ──
  const [domainTopic, setDomainTopic] = useState("");
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // ── Checklist ──
  const [checked, setChecked] = useState<boolean[]>(new Array(checklistItems.length).fill(false));
  const [showChecklist, setShowChecklist] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  // ── Title Generator ──
  const [titleDesc, setTitleDesc]       = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }

    setAnalyzingImages(true);
    const newResults: ImageAnalysisResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await analyzeImageForStock(file, base64);
        newResults.push(result);
        toast.success(`✅ تم تحليل: ${file.name}`);
      } catch (err: any) {
        toast.error(`❌ خطأ في تحليل ${file.name}: ${err.message}`);
      }
    }
    
    setImageResults(prev => [...prev, ...newResults]);
    setAnalyzingImages(false);
    if (e.target) e.target.value = ''; // reset
  };

  const exportToCSV = () => {
    if (imageResults.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    
    let csv = "Filename,Title,Keywords,Category,Releases\\n";
    imageResults.forEach(res => {
      const escapedTitle = res.title.replace(/"/g, '""');
      const escapedKeywords = res.keywords.join(",").replace(/"/g, '""');
      csv += `"${res.filename}","${escapedTitle}","${escapedKeywords}","",\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `adobe_stock_metadata_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم التصدير بنجاح! جاهز للرفع إلى Adobe Stock 🚀");
  };

  const handleKeywords = async () => {
    const topic = keywordTopic.trim() || "AI technology";
    setLoadingKw(true);
    setKeywords([]);
    try {
      let result: string[];
      if (engine === "claude" && hasClaudeKey()) {
        result = await generateClaudeKeywords(topic, keywordCount);
        trackAiMetric("claude", "keywords", "success");
        toast.success("✅ تم التوليد بـ Claude AI!");
      } else {
        try {
          result = await generateAIKeywords(topic, keywordCount);
          trackAiMetric("gemini", "keywords", "success");
          toast.success("✅ تم التوليد بـ Gemini AI!");
        } catch {
          trackAiMetric("gemini", "keywords", "failure");
          if (hasClaudeKey()) {
            result = await generateClaudeKeywords(topic, keywordCount);
            trackAiMetric("claude", "keywords", "success");
            toast.success("✅ تم التحويل تلقائياً إلى Claude");
          } else {
            throw new Error("fallback-local");
          }
        }
      }
      setKeywords(result);
    } catch {
      const fallback = [
        "background", "concept", "design", "illustration", "vector", "abstract", "modern",
        "professional", "business", "technology", "innovation", "digital", "creative",
        "contemporary", "minimalist", "3D", "realistic", "stock photo", "commercial",
        "marketing", "advertising", "template", "web", "artistic", "style",
      ];
      setKeywords(fallback.slice(0, keywordCount));
      trackAiMetric("local", "keywords", "success");
      toast.error("تم استخدام المولد المحلي كبديل");
    } finally {
      setLoadingKw(false);
    }
  };

  const handleTopKeywords = async () => {
    const topic = domainTopic.trim() || "technology";
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    setLoadingTop(true);
    setTopKeywords([]);
    try {
      let result = await getTopKeywordsForDomain(topic, 50);
      trackAiMetric("gemini", "keywords", "success");
      if (result.length === 0 && hasClaudeKey()) {
        result = await generateClaudeKeywords(topic, 50);
        trackAiMetric("claude", "keywords", "success");
      }
      setTopKeywords(result);
      toast.success(`✅ تم اكتشاف ${result.length} كلمة شائعة في مجال "${topic}"!`);
    } catch {
      trackAiMetric("gemini", "keywords", "failure");
      toast.error("تعذر التحميل. تحقق من مفتاح API.");
    } finally {
      setLoadingTop(false);
    }
  };

  const copyAllKeywords = () => {
    navigator.clipboard.writeText(keywords.join(", "));
    toast.success("تم نسخ جميع الكلمات!");
  };

  const copyKeywordLines = () => {
    navigator.clipboard.writeText(keywords.join("\n"));
    toast.success("تم النسخ (سطر لكل كلمة)!");
  };

  const toggleCheck = (i: number) => {
    setChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const resetChecklist = () => setChecked(new Array(checklistItems.length).fill(false));

  const checkedCount = checked.filter(Boolean).length;
  const percentage = Math.round((checkedCount / checklistItems.length) * 100);
  const isReady = percentage === 100;

  useEffect(() => {
    try {
      setQuickNote(localStorage.getItem(NOTES_STORAGE_KEY) || "");
      const saved = localStorage.getItem(NOTES_ARCHIVE_STORAGE_KEY);
      setSavedNotes(saved ? JSON.parse(saved) : []);
    } catch {
      setQuickNote("");
      setSavedNotes([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, quickNote);
    } catch {}
  }, [quickNote]);

  const saveCurrentNote = () => {
    const trimmed = quickNote.trim();
    if (!trimmed) {
      toast.error("اكتب ملاحظة أو برومبت أولاً");
      return;
    }
    if (savedNotes.includes(trimmed)) {
      toast.error("هذا النص محفوظ بالفعل");
      return;
    }
    const next = [trimmed, ...savedNotes].slice(0, 20);
    setSavedNotes(next);
    try {
      localStorage.setItem(NOTES_ARCHIVE_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    toast.success("تم حفظ النص في المذكرة");
  };

  const deleteSavedNote = (index: number) => {
    const next = savedNotes.filter((_, i) => i !== index);
    setSavedNotes(next);
    try {
      localStorage.setItem(NOTES_ARCHIVE_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  // Quick title generator (local, no API needed)
  const generateTitles = () => {
    if (!titleDesc.trim()) { toast.error("أدخل وصفاً للصورة"); return; }
    const prefixes = ["Professional", "Modern", "Abstract", "Creative", "Minimal", "Dynamic"];
    const suffixes = ["Background", "Concept", "Design", "Illustration", "Vector", "Template"];
    const titles = Array.from({ length: 5 }, () => {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${p} ${titleDesc} ${s}`;
    });
    setGeneratedTitles(titles);
  };

  const inputClass  = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full mb-3";
  const selectClass = inputClass;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Image Analyzer (Replaced Profit Calculator) ── */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-base font-semibold text-primary text-glow font-mono">🖼️ محلل الصور & مصدر CSV</h3>
            {imageResults.length > 0 && (
              <button 
                onClick={exportToCSV}
                className="text-[10px] px-3 py-1.5 gradient-primary text-primary-foreground rounded font-mono font-bold hover:scale-105 transition-all shadow-glow"
              >
                📥 تصدير CSV
              </button>
            )}
          </div>
          
          <p className="text-secondary font-mono text-[11px] mb-4">
            ارفع صورك هنا وسيقوم الذكاء الاصطناعي بكتابة العناوين والكلمات المفتاحية لها تلقائياً.
          </p>

          <label className="border-2 border-dashed border-primary/50 hover:border-primary bg-primary/5 flex flex-col items-center justify-center p-6 rounded-lg cursor-pointer transition-all group mb-4">
            <span className="text-primary text-2xl mb-2 group-hover:scale-110 transition-transform">📸</span>
            <span className="text-primary font-mono text-xs font-semibold">اضغط لاختيار الصور</span>
            <span className="text-secondary font-mono text-[10px] mt-1">(يمكنك اختيار عدة صور معاً)</span>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={analyzingImages}
              className="hidden" 
            />
          </label>

          {analyzingImages && (
            <div className="text-center py-2 animate-pulse text-accent font-mono text-xs font-semibold flex items-center justify-center gap-2">
              <span className="animate-spin text-lg">⚙️</span> جاري تحليل الصور بالذكاء الاصطناعي...
            </div>
          )}

          {imageResults.length > 0 && (
            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-3 custom-scrollbar">
              {imageResults.map((res, i) => (
                <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg p-3 relative group">
                  <button 
                    onClick={() => setImageResults(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-2 left-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف"
                  >
                    🗑️
                  </button>
                  <p className="text-primary font-mono text-[10px] font-bold mb-1 break-all pr-6">{res.filename}</p>
                  <p className="text-secondary font-mono text-[11px] mb-2 leading-relaxed">{res.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {res.keywords.slice(0, 10).map((kw, idx) => (
                      <span key={idx} className="text-[9px] bg-primary/10 text-secondary px-1.5 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                    {res.keywords.length > 10 && (
                      <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                        +{res.keywords.length - 10} أكثر
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Keyword Generator (Claude + Gemini) ── */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔑 مولد الكلمات المفتاحية</h3>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">محرك الذكاء الاصطناعي:</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setEngine("claude")}
              className={`flex-1 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "claude"
                  ? "bg-accent/20 text-accent border-accent box-glow-gold"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              ✦ Claude {!hasClaudeKey() && "(بدون مفتاح)"}
            </button>
            <button
              onClick={() => setEngine("gemini")}
              className={`flex-1 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "gemini"
                  ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              🔮 Gemini
            </button>
          </div>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">الموضوع:</label>
          <input
            type="text"
            value={keywordTopic}
            onChange={(e) => setKeywordTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleKeywords()}
            placeholder="مثال: AI technology, sustainability..."
            className={inputClass}
          />

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">عدد الكلمات:</label>
          <select value={keywordCount} onChange={(e) => setKeywordCount(Number(e.target.value))} className={selectClass}>
            <option value={25}>25 كلمة</option>
            <option value={49}>49 كلمة (الحد الأقصى لـ Adobe Stock)</option>
          </select>

          <button onClick={handleKeywords} disabled={loadingKw} className="w-full gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50">
            {loadingKw ? "⏳ جاري التوليد..." : "🔍 توليد الكلمات المفتاحية"}
          </button>

          {keywords.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary font-mono text-[10px] font-semibold">{keywords.length} كلمة مفتاحية</p>
                <div className="flex gap-2">
                  <button onClick={copyAllKeywords} className="text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all">نسخ (فاصلة)</button>
                  <button onClick={copyKeywordLines} className="text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all">نسخ (أسطر)</button>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      onClick={() => { navigator.clipboard.writeText(kw); toast.success(`نسخ: ${kw}`); }}
                      className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-secondary px-2 py-0.5 rounded cursor-pointer hover:bg-primary/20 hover:text-primary transition-all"
                      title="اضغط للنسخ"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── اكتشاف الكلمات المفتاحية الشائعة لكل مجال ── */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-4 font-mono">
          🔎 اكتشاف الكلمات الأكثر استعمالاً في كل مجال
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-3">
          أدخل المجال أو الموضوع لاكتشاف أكثر الكلمات بحثاً على Adobe Stock (مثل: Cooking, Technology, Nature...)
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">المجال:</label>
            <input
              type="text"
              value={domainTopic}
              onChange={(e) => setDomainTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTopKeywords()}
              placeholder="Cooking, Food, Technology, Nature..."
              className={inputClass}
            />
          </div>
          <button
            onClick={handleTopKeywords}
            disabled={loadingTop}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loadingTop ? "⏳ جاري الاكتشاف..." : "🔍 اكتشف الكلمات الشائعة"}
          </button>
        </div>
        {topKeywords.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-primary font-mono text-[10px] font-semibold">{topKeywords.length} كلمة الأكثر بحثاً</p>
              <button
                onClick={() => { navigator.clipboard.writeText(topKeywords.join(", ")); toast.success("تم النسخ!"); }}
                className="text-[10px] px-2 py-1 border border-accent/40 text-accent rounded font-mono hover:bg-accent/10 transition-all"
              >
                نسخ الكل
              </button>
            </div>
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {topKeywords.map((kw, i) => (
                  <span
                    key={i}
                    onClick={() => { navigator.clipboard.writeText(kw); toast.success(`نسخ: ${kw}`); }}
                    className="text-[10px] font-mono bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded cursor-pointer hover:bg-accent/20 transition-all"
                    title="اضغط للنسخ"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Title Generator ── */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">✍️ مولد العناوين السريع</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={titleDesc}
            onChange={(e) => setTitleDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateTitles()}
            placeholder="صف محتوى الصورة بالإنجليزية... مثال: neural network"
            className="flex-1 min-w-[240px] bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong"
          />
          <button onClick={generateTitles} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all">
            ✨ توليد عناوين
          </button>
        </div>
        {generatedTitles.length > 0 && (
          <div className="mt-4 space-y-2">
            {generatedTitles.map((title, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                <span className="font-mono text-xs text-secondary flex-1">{title}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(title); toast.success("تم النسخ!"); }}
                  className="shrink-0 text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all"
                >
                  نسخ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pre-Upload Checklist (collapsible) ── */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <button
            onClick={() => setShowChecklist((v) => !v)}
            className="flex items-center gap-2 text-base font-semibold text-primary text-glow font-mono"
          >
            <span>{showChecklist ? "▾" : "▸"}</span>
            <span>✅ قائمة فحص ما قبل الرفع</span>
          </button>
          <div className="flex items-center gap-3">
            {isReady && <span className="text-primary text-xs font-mono font-semibold animate-pulse-glow">🚀 جاهز للرفع!</span>}
            <button onClick={resetChecklist} className="text-[10px] px-3 py-1.5 border border-destructive/40 text-destructive rounded font-mono hover:bg-destructive/10 transition-all">
              ↺ إعادة تعيين
            </button>
          </div>
        </div>

        {showChecklist && (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-mono text-secondary mb-1">
                <span>{checkedCount}/{checklistItems.length} عنصر</span>
                <span className="text-primary font-semibold">{percentage}%</span>
              </div>
              <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isReady ? "bg-accent" : "bg-primary/70"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {checklistItems.map((item, i) => (
                <div
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all font-mono text-xs ${
                    checked[i] ? "bg-primary/5 opacity-50" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    checked[i] ? "bg-primary border-primary" : "border-primary/50"
                  }`}>
                    {checked[i] && <span className="text-background text-[8px] font-bold">✓</span>}
                  </div>
                  <label className={`flex-1 cursor-pointer text-secondary ${checked[i] ? "line-through" : ""}`}>{item}</label>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Quick Notes / Prompt Vault ── */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-3 font-mono">📝 مذكرة البرومبتات</h3>
        <p className="text-[11px] text-secondary font-mono mb-3">
          مساحة سريعة لحفظ أي نص/برومبت تحتاجه لاحقًا.
        </p>
        <textarea
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="اكتب هنا مذكرتك أو البرومبت..."
          className="w-full min-h-[120px] bg-card border-2 border-accent/50 text-primary p-3 rounded-md font-mono text-xs focus:outline-none focus:box-glow-gold"
        />
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={saveCurrentNote}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all"
          >
            💾 حفظ في المذكرة
          </button>
          <button
            onClick={() => {
              setQuickNote("");
              toast.success("تم مسح خانة الكتابة");
            }}
            className="bg-card border-2 border-primary text-primary px-4 py-2 rounded-md font-mono text-xs font-semibold hover:bg-primary/10 transition-all"
          >
            🧹 مسح الخانة
          </button>
        </div>

        {savedNotes.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-primary font-mono text-[10px] font-semibold">النصوص المحفوظة ({savedNotes.length})</p>
            {savedNotes.map((note, index) => (
              <div key={`${note.slice(0, 20)}-${index}`} className="bg-accent/5 border border-accent/30 rounded-md p-3">
                <div className="text-secondary font-mono text-[11px] whitespace-pre-wrap">{note}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(note);
                      toast.success("تم نسخ النص");
                    }}
                    className="text-[10px] px-2 py-1 border border-accent/40 text-accent rounded font-mono hover:bg-accent/10 transition-all"
                  >
                    📋 نسخ
                  </button>
                  <button
                    onClick={() => setQuickNote(note)}
                    className="text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all"
                  >
                    ✏️ تحميل للخانة
                  </button>
                  <button
                    onClick={() => deleteSavedNote(index)}
                    className="text-[10px] px-2 py-1 border border-destructive/40 text-destructive rounded font-mono hover:bg-destructive/10 transition-all"
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
