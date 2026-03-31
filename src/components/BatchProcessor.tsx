import { useState, useCallback } from "react";
import { analyzeImageForStock, hasAnyApiKey, type ImageAnalysisResult } from "@/lib/gemini";
import { toast } from "sonner";
import { exportCsvFile, copyTextSafely } from "@/lib/shared";

const extractFrameFromVideo = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to 1 second, or middle if it's very short
      video.currentTime = Math.min(1.5, video.duration / 2);
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUri);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(new Error("فشل استخراج إطار من الفيديو"));
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل تحميل الفيديو"));
    };
  });
};

export default function BatchProcessor() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ImageAnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem("batch_processor_results");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    setFiles((prev) => [...prev, ...droppedFiles]);
    toast.success(`تم إضافة ${droppedFiles.length} ملف`);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    setFiles((prev) => [...prev, ...selected]);
    if (e.target) e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (files.length === 0) {
      toast.error("أضف صوراً أولاً");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);

    const newResults: ImageAnalysisResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(file.name);
      setProgress(Math.round(((i) / files.length) * 100));

      try {
        let base64 = "";
        
        if (file.type.startsWith("video/")) {
          // Extract a frame from the video locally on the client browser
          base64 = await extractFrameFromVideo(file);
        } else {
          // Read image as base64
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        // Artificial delay (3 seconds) to prevent API rate limit (except for the first file)
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 3500));
        }

        const result = await analyzeImageForStock(file, base64);
        newResults.push(result);
      } catch (err: any) {
        toast.error(`❌ خطأ في ${file.name}: ${err.message}`);
        // Add a placeholder result
        newResults.push({
          filename: file.name,
          title: `[Error] ${err.message}`,
          keywords: [],
          prompt: "",
          colorPalette: "",
        });
      }
    }

    setResults(newResults);
    setProgress(100);
    setCurrentFile("");
    setProcessing(false);
    // Persist results
    try { localStorage.setItem("batch_processor_results", JSON.stringify(newResults)); } catch {}
    toast.success(`✅ تم تحليل ${newResults.filter(r => !r.title.startsWith("[Error]")).length}/${files.length} صورة`);
  };

  const handleExport = () => {
    const valid = results.filter((r) => !r.title.startsWith("[Error]"));
    if (valid.length === 0) { toast.error("لا توجد بيانات للتصدير"); return; }
    exportCsvFile(
      `adobe_stock_batch_${Date.now()}.csv`,
      ["Filename", "Title", "Keywords", "Prompt", "Color Palette", "Category", "Releases"],
      valid.map((r) => [
        r.filename,
        r.title,
        r.keywords.join(","),
        r.prompt || "",
        r.colorPalette || "",
        "",
        "",
      ])
    );
    toast.success("📥 تم التصدير — جاهز للرفع إلى Adobe Stock!");
  };

  const handleCopyAll = async () => {
    const text = results
      .filter((r) => !r.title.startsWith("[Error]"))
      .map((r) => `${r.filename}\nTitle: ${r.title}\nKeywords: ${r.keywords.join(", ")}\n`)
      .join("\n---\n");
    const ok = await copyTextSafely(text);
    if (ok) toast.success("تم النسخ!");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Upload Zone */}
      <div
        className="rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/[0.08] p-8 text-center hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all cursor-pointer relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="text-4xl mb-3">📦</div>
        <h2 className="text-lg font-bold text-white mb-2">معالج الدفعات</h2>
        <p className="text-sm text-slate-500 mb-1">اسحب وأفلت الصور والفيديوهات هنا أو اضغط لاختيارها</p>
        <p className="text-[10px] text-slate-600">يدعم PNG, JPG, MP4, MOV</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">📁 {files.length} ملف جاهز</h3>
            <div className="flex gap-2">
              <button onClick={() => setFiles([])} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">مسح الكل</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative group rounded-xl bg-white/[0.03] border border-white/[0.06] p-2 text-center">
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ✕
                </button>
                <div className="text-lg mb-1">🖼️</div>
                <p className="text-[9px] text-slate-500 truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Processing */}
      {files.length > 0 && !processing && results.length === 0 && (
        <button
          onClick={handleProcess}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-blue-500/20"
        >
          🚀 ابدأ التحليل الجماعي ({files.length} صورة)
        </button>
      )}

      {/* Reprocess button when results exist */}
      {results.length > 0 && !processing && (
        <div className="flex gap-2">
          <button
            onClick={handleProcess}
            disabled={files.length === 0}
            className="flex-1 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-semibold hover:text-white transition-all disabled:opacity-30"
          >
            🔄 إعادة التحليل ({files.length})
          </button>
          <button
            onClick={() => {
              setResults([]);
              localStorage.removeItem("batch_processor_results");
              toast.success("تم مسح النتائج");
            }}
            className="px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
          >
            🗑️ مسح النتائج
          </button>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">⏳ جاري التحليل...</span>
            <span className="text-xs text-blue-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">📸 {currentFile}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !processing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">✅ النتائج ({results.filter(r => !r.title.startsWith("[Error]")).length} ناجحة)</h3>
            <div className="flex gap-2">
              <button onClick={handleCopyAll} className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 hover:text-white transition-all">
                📋 نسخ الكل
              </button>
              <button onClick={handleExport} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                📥 تصدير CSV (Adobe Ready)
              </button>
            </div>
          </div>

          {results.map((res, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${
                res.title.startsWith("[Error]")
                  ? "bg-red-500/[0.03] border-red-500/10"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">{res.title.startsWith("[Error]") ? "❌" : "✅"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-600 mb-1">{res.filename}</p>
                  <p className="text-xs text-white font-semibold mb-1.5">{res.title}</p>
                  {res.colorPalette && (
                    <p className="text-[10px] text-blue-400 mb-1">🎨 {res.colorPalette}</p>
                  )}
                  {res.prompt && (
                    <p className="text-[10px] text-slate-500 italic mb-2 line-clamp-2">{res.prompt}</p>
                  )}
                  {res.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {res.keywords.slice(0, 12).map((kw, ki) => (
                        <span key={ki} className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-500 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                      {res.keywords.length > 12 && <span className="text-[9px] text-slate-600">+{res.keywords.length - 12}</span>}
                    </div>
                  )}
                  {!res.title.startsWith("[Error]") && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => copyTextSafely(res.keywords.join(", ")).then(ok => ok && toast.success("تم نسخ Keywords!"))}
                        className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-500 px-2 py-1 rounded hover:text-white transition-colors"
                      >
                        📋 Keywords
                      </button>
                      {res.prompt && (
                        <button
                          onClick={() => copyTextSafely(res.prompt).then(ok => ok && toast.success("تم نسخ Prompt!"))}
                          className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-500 px-2 py-1 rounded hover:text-white transition-colors"
                        >
                          📋 Prompt
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
