import { useState, useCallback, useRef } from "react";
import { analyzeImageForStock, hasAnyApiKey, getUserGeminiApiKeys, type ImageAnalysisResult } from "@/lib/gemini";
import { toast } from "sonner";
import { exportCsvFile, copyTextSafely } from "@/lib/shared";
import { sanitizeForExport, sanitizeKeywordsForExport } from "@/lib/sanitizer";
import ShinyText from "./animations/ShinyText";
import DecryptedText from "./animations/DecryptedText";

// ─────────────────────────────────────────────
// 🎬  3-Frame Panorama Extraction (الاستخراج الذكي)
// ─────────────────────────────────────────────

/** Seek to a specific time and draw the frame onto a canvas context */
function seekAndDraw(
  video: HTMLVideoElement,
  time: number,
  ctx: CanvasRenderingContext2D,
  x: number,
  frameW: number,
  frameH: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        ctx.drawImage(video, x, 0, frameW, frameH);
        resolve();
      } catch {
        reject(new Error("Failed to draw frame"));
      }
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

/**
 * Extracts 3 frames from a video (at 20%, 50%, 80% of duration)
 * and stitches them side-by-side into a single panorama JPEG.
 * This gives the AI a full "motion timeline" of the video.
 */
const extractPanoramaFromVideo = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration < 0.5) {
          // Fallback: too short, just grab one frame
          video.currentTime = 0.1;
          const waitSeeked = () =>
            new Promise<void>((res) => {
              video.addEventListener("seeked", () => res(), { once: true });
            });
          await waitSeeked();
          const c = document.createElement("canvas");
          c.width = video.videoWidth || 640;
          c.height = video.videoHeight || 360;
          c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL("image/jpeg", 0.82));
          return;
        }

        // Calculate the 3 timestamps
        const times = [duration * 0.2, duration * 0.5, duration * 0.8];

        // Frame dimensions – cap width to prevent oversized canvas
        const maxFrameW = Math.min(video.videoWidth || 640, 640);
        const scale = maxFrameW / (video.videoWidth || 640);
        const frameW = maxFrameW;
        const frameH = Math.round((video.videoHeight || 360) * scale);

        // Create the panorama canvas (3 frames side-by-side with labels)
        const labelH = 28; // height for the label bar
        const canvas = document.createElement("canvas");
        canvas.width = frameW * 3;
        canvas.height = frameH + labelH;
        const ctx = canvas.getContext("2d")!;

        // Black background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw each frame
        for (let i = 0; i < 3; i++) {
          await seekAndDraw(video, times[i], ctx, i * frameW, frameW, frameH);
        }

        // Draw labels at top
        ctx.font = "bold 16px Arial, sans-serif";
        ctx.textAlign = "center";
        const labels = ["▶ START (20%)", "■ MIDDLE (50%)", "◼ END (80%)"];
        const colors = ["#4ade80", "#60a5fa", "#f472b6"];
        for (let i = 0; i < 3; i++) {
          // Semi-transparent label background
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(i * frameW, frameH, frameW, labelH);
          // Label text
          ctx.fillStyle = colors[i];
          ctx.fillText(labels[i], i * frameW + frameW / 2, frameH + 20);
        }

        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل تحميل الفيديو"));
    };
  });
};

/** Read an image file as base64 data URI */
const readImageBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─────────────────────────────────────────────
// 🔧  Utility
// ─────────────────────────────────────────────

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}

// ─────────────────────────────────────────────
// 🧩  Component
// ─────────────────────────────────────────────

interface BatchStats {
  completed: number;
  total: number;
  errors: number;
  activeLanes: number;
  maxLanes: number;
  eta: string;
  startTime: number;
}

export default function BatchProcessor() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ImageAnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem("batch_processor_results");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<BatchStats>({
    completed: 0, total: 0, errors: 0,
    activeLanes: 0, maxLanes: 1, eta: "—", startTime: 0,
  });
  const [currentFiles, setCurrentFiles] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cancelRef = useRef(false);

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
    toast.success(`تم إضافة ${droppedFiles.length} ملف`);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...selected]);
    if (e.target) e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────
  //  🚀  Core Concurrent Processing Engine
  // ─────────────────────────────────────────

  const handleProcess = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (files.length === 0) {
      toast.error("أضف صوراً أولاً");
      return;
    }

    cancelRef.current = false;
    setProcessing(true);
    setResults([]);

    // Determine concurrency from number of API keys
    const apiKeys = getUserGeminiApiKeys();
    // Increase cap to 12 for high-performance processing when multiple keys exist
    const concurrency = Math.min(12, Math.max(1, apiKeys.length));
    // Reduced delay: with 10 keys, a 2s lane delay means each key rests for ~20s between calls
    const delayPerKey = apiKeys.length >= 5 ? 2000 : 4000;

    const total = files.length;
    const startTime = Date.now();
    let completed = 0;
    let errors = 0;

    setStats({
      completed: 0, total, errors: 0,
      activeLanes: 0, maxLanes: concurrency,
      eta: "جاري التحليل...", startTime,
    });

    // Use common array for all lanes
    const newResults: ImageAnalysisResult[] = results.length === total ? [...results] : new Array(total).fill(null);

    // Process a single file
    const processFile = async (index: number) => {
      if (cancelRef.current) return;
      
      // Skip if already processed successfully
      if (newResults[index] && !newResults[index].title.startsWith("[Error]")) {
        completed++;
        return;
      }

      const file = files[index];
      setCurrentFiles((prev) => [...prev, file.name]);

      try {
        let base64: string;
        let isPanorama = false;

        if (file.type.startsWith("video/")) {
          base64 = await extractPanoramaFromVideo(file);
          isPanorama = true;
        } else {
          base64 = await readImageBase64(file);
        }

        const result = await analyzeImageForStock(file, base64, isPanorama);
        newResults[index] = result;
      } catch (err: any) {
        errors++;
        newResults[index] = {
          filename: file.name,
          title: `[Error] ${err.message}`,
          keywords: [],
          prompt: "",
          colorPalette: "",
        };
      } finally {
        completed++;
        setCurrentFiles((prev) => prev.filter((n) => n !== file.name));

        // Calculate ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (completed || 1) / elapsed;
        const remaining = total - completed;
        const etaSeconds = rate > 0 ? remaining / rate : 0;

        setStats(prev => ({
          ...prev,
          completed, errors,
          activeLanes: Math.min(concurrency, total - completed),
          eta: formatEta(etaSeconds),
        }));

        // Update results progressively
        const currentBatch = [...newResults.filter(Boolean)];
        setResults(currentBatch);
        
        // Progressive persistence
        try {
          localStorage.setItem("batch_processor_results", JSON.stringify(currentBatch));
        } catch {}
      }
    };

    // Chunk files into batches based on concurrency
    // Each lane processes files sequentially with a delay between them
    if (concurrency <= 1) {
      // Sequential mode (single key)
      for (let i = 0; i < total; i++) {
        if (cancelRef.current) break;
        setStats((prev) => ({ ...prev, activeLanes: 1 }));
        await processFile(i);
        if (i < total - 1 && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, delayPerKey));
        }
      }
    } else {
      const lanes: number[][] = Array.from({ length: concurrency }, () => []);
      for (let i = 0; i < total; i++) {
        lanes[i % concurrency].push(i);
      }

      const lanePromises = lanes.map(async (fileIndices, laneIndex) => {
        for (let j = 0; j < fileIndices.length; j++) {
          if (cancelRef.current) break;

          // Faster staggering for 10+ lanes
          if (j === 0 && laneIndex > 0) {
            await new Promise((r) => setTimeout(r, laneIndex * 400));
          }

          await processFile(fileIndices[j]);

          if (j < fileIndices.length - 1 && !cancelRef.current) {
            await new Promise((r) => setTimeout(r, delayPerKey));
          }
        }
      });

      await Promise.all(lanePromises);
    }

    const finalResults = newResults.filter(Boolean);
    setResults(finalResults);
    setStats((prev) => ({ ...prev, activeLanes: 0, eta: "—" }));
    setProcessing(false);
    setCurrentFiles([]);

    try {
      localStorage.setItem("batch_processor_results", JSON.stringify(finalResults));
    } catch {}

    const successCount = finalResults.filter((r) => !r.title.startsWith("[Error]")).length;
    if (cancelRef.current) {
      toast.info(`⏹️ تم الإيقاف — ${successCount} ناجحة من ${completed} معالَجة`);
    } else {
      if (errors > 0) {
        toast.warning(`⚠️ اكتمل مع ${errors} أخطاء. استخدم زر "إعادة محاولة الفاشلة".`);
      } else {
        toast.success(`✅ تم تحليل ${successCount}/${total} ملف بنجاح!`);
      }
    }
  };

  const handleRetryFailed = () => {
    const failedExist = results.some(r => r.title.startsWith("[Error]"));
    if (!failedExist) {
      toast.info("لا توجد ملفات فاشلة ✨");
      return;
    }
    toast.info("🔄 إعادة محاولة الملفات الفاشلة...");
    handleProcess();
  };

  const handleCancel = () => {
    cancelRef.current = true;
    toast.info("⏹️ جاري الإيقاف...");
  };

  const handleAutoFilter = () => {
    const originalCount = results.length;
    const filtered = results.filter(r => 
      !r.title.startsWith("[Error]") && 
      (r.estimatedAcceptance !== undefined ? r.estimatedAcceptance >= 80 : true) && 
      (r.deformationScore !== undefined ? r.deformationScore <= 30 : true)
    );
    setResults(filtered);
    try {
      localStorage.setItem("batch_processor_results", JSON.stringify(filtered));
    } catch {}
    
    const removedCount = originalCount - filtered.length;
    if (removedCount > 0) {
      toast.success(`تم التصفية 🧹! تم استبعاد ${removedCount} ملف ذي جودة منخفضة.`);
    } else {
      toast.info("كل الملفات اجتازت الفلتر المشدد! ✨");
    }
  };

  const handleExport = () => {
    const valid = results.filter((r) => !r.title.startsWith("[Error]"));
    if (valid.length === 0) { toast.error("لا توجد بيانات للتصدير"); return; }
    exportCsvFile(
      `adobe_stock_batch_${Date.now()}.csv`,
      ["Filename", "Title", "Keywords", "Prompt", "Color Palette", "Category", "Releases"],
      valid.map((r) => [
        r.filename,
        sanitizeForExport(r.title),
        sanitizeKeywordsForExport(r.keywords).join(","),
        sanitizeForExport(r.prompt || ""),
        r.colorPalette || "",
        "",
        "",
      ])
    );
    toast.success("📥 تم التصدير — جاهز للرفع إلى Adobe Stock!");
  };
  
  const handleClearResults = () => {
    if (results.length === 0) return;
    if (confirm("هل أنت متأكد من رغبتك في مسح كافة نتائج التحليل الحالية؟")) {
      setResults([]);
      try {
        localStorage.removeItem("batch_processor_results");
      } catch {}
      toast.success("تم مسح القائمة بنجاح");
    }
  };

  const removeResult = (index: number) => {
    const newResults = results.filter((_, i) => i !== index);
    setResults(newResults);
    try {
      localStorage.setItem("batch_processor_results", JSON.stringify(newResults));
    } catch {}
    toast.success("تم حذف الملف من القائمة");
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
        <h2 className="text-lg font-bold text-white mb-2">معالج الدفعات المتقدم</h2>
        <p className="text-sm text-slate-500 mb-1">اسحب وأفلت الصور والفيديوهات هنا أو اضغط لاختيارها</p>
        <p className="text-[10px] text-slate-600">يدعم PNG, JPG, MP4, MOV — الفيديوهات تستخرج منها 3 لقطات ذكية تلقائياً 🎬</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">📁 {files.length} ملف جاهز</h3>
            <div className="flex gap-2 items-center">
              {!processing && (
                <span className="text-[10px] text-slate-600">
                  ⚡ {Math.max(1, Math.min(getUserGeminiApiKeys().length, 5))} مسارات متزامنة
                </span>
              )}
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
                <div className="text-lg mb-1">{file.type.startsWith("video/") ? "🎬" : "🖼️"}</div>
                <p className="text-[9px] text-slate-500 truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Processing */}
      {files.length > 0 && !processing && (
        <div className="flex gap-2">
          <button
            onClick={handleProcess}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-blue-500/20"
          >
            🚀 {results.length > 0 ? "إعادة تحليل الدفعة" : "ابدأ التحليل الجماعي"} ({files.length} ملف)
          </button>
          
          {results.some(r => r.title.startsWith("[Error]")) && (
            <button
              onClick={handleRetryFailed}
              className="px-6 py-2.5 rounded-2xl bg-orange-600/20 border border-orange-600/30 text-orange-400 text-xs font-bold hover:bg-orange-600/30 transition-all"
            >
              🔄 إعادة محاولة الفاشلة
            </button>
          )}

          {results.length > 0 && (
            <button
              onClick={() => {
                setResults([]);
                localStorage.removeItem("batch_processor_results");
                toast.success("تم مسح النتائج");
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
            >
              🗑️ مسح
            </button>
          )}
        </div>
      )}

      {/* Progress — Enhanced with concurrency stats */}
      {processing && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">⏳ جاري التحليل...</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-400 font-bold">{progress}%</span>
              <button
                onClick={handleCancel}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
              >
                ⏹️ إيقاف
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex gap-4">
              <span>✅ {stats.completed}/{stats.total}</span>
              {stats.errors > 0 && <span className="text-red-400">❌ {stats.errors} أخطاء</span>}
              <span>⚡ {stats.activeLanes}/{stats.maxLanes} مسارات نشطة</span>
            </div>
            <span>⏱️ ETA: {stats.eta}</span>
          </div>

          {/* Currently processing files */}
          {currentFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentFiles.map((name, i) => (
                <span key={i} className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg animate-pulse">
                  📸 {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !processing && (
        <div className="space-y-4">
          {(() => {
            const successList = results.filter(r => !r.title.startsWith("[Error]"));
            const errorsCount = results.length - successList.length;
            const accepted = successList.filter(r => (r.estimatedAcceptance !== undefined ? r.estimatedAcceptance >= 80 : true) && (r.deformationScore !== undefined ? r.deformationScore <= 30 : true));
            const perfectQualityCount = successList.filter(r => (r.estimatedAcceptance !== undefined ? r.estimatedAcceptance >= 95 : false)).length;
            const highRiskCount = successList.filter(r => (r.estimatedAcceptance !== undefined ? r.estimatedAcceptance < 60 : false) || (r.deformationScore !== undefined ? r.deformationScore > 50 : false)).length;
            const averageAcceptance = successList.length > 0 ? Math.round(successList.reduce((acc, r) => acc + (r.estimatedAcceptance || 0), 0) / successList.length) : 0;
            
            return (
              <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2 relative z-10">
                  <span>📊</span> <ShinyText text="تقرير فحص الجودة الشامل" speed={4} />
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 relative z-10">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">{successList.length} <span className="text-xs text-slate-500">/ {results.length}</span></div>
                    <div className="text-[10px] text-slate-400">تم تحليله بنجاح</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">{accepted.length}</div>
                    <div className="text-[10px] text-green-500/70">مقبول ومطابق</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{perfectQualityCount}</div>
                    <div className="text-[10px] text-blue-500/70">تصنيف امتياز (+95%)</div>
                  </div>
                  <button 
                    onClick={() => {
                      setRiskFilter(prev => !prev);
                      if (!riskFilter) setDetailsOpen(true);
                    }}
                    className={`bg-red-500/10 border ${riskFilter ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] scale-105' : 'border-red-500/20'} rounded-2xl p-4 text-center cursor-pointer hover:bg-red-500/20 transition-all`}
                  >
                    <div className="text-2xl font-bold text-red-400 mb-1">{highRiskCount}</div>
                    <div className="text-[10px] text-red-500/70">{riskFilter ? "إلغاء فلتر الخطر ✖" : "اضغط لعرض الخطرة فقط"}</div>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between mt-2 pt-4 border-t border-white/10 relative z-10 gap-3">
                  <div className="flex items-center gap-3">
                    <button onClick={handleAutoFilter} className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-bold text-orange-400 hover:bg-orange-500/20 hover:scale-105 transition-all shadow-lg shadow-orange-500/10">
                      🧹 تصفية المرفوض ({successList.length - accepted.length})
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                      📥 تصدير CSV (Adobe Ready)
                    </button>
                    <button onClick={handleClearResults} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all">
                      🗑️ مسح الكل
                    </button>
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    متوسط القبول: <span className="text-blue-400 ml-1">{averageAcceptance}%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <details className="group" open={detailsOpen} onToggle={(e) => setDetailsOpen(e.currentTarget.open)}>
            <summary className="flex items-center justify-between cursor-pointer p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all list-none">
              <span className="text-sm font-bold text-white flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs transition-transform text-slate-400 shadow-inner ${detailsOpen ? 'rotate-90' : ''}`}>▶</span>
                📋 {riskFilter ? "مراجعة الملفات الخطرة فقط" : "استعراض كافة تفاصيل الملفات المحللة"}
              </span>
              <button 
                onClick={(e) => { e.preventDefault(); handleCopyAll(); }} 
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 hover:text-white transition-all shadow-sm"
              >
                📋 نسخ الكل
              </button>
            </summary>
            
            <div className="pt-4 space-y-3">
              {results.filter(res => {
                if (!riskFilter) return true;
                return (!res.title.startsWith("[Error]") && ((res.estimatedAcceptance !== undefined ? res.estimatedAcceptance < 60 : false) || (res.deformationScore !== undefined ? res.deformationScore > 50 : false)));
              }).map((res, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 relative ${
                res.title.startsWith("[Error]")
                  ? "bg-red-500/[0.03] border-red-500/10"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">{res.title.startsWith("[Error]") ? "❌" : "✅"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 mb-1 cursor-crosshair" title="قم بالتمرير لفك التشفير أو إخفائه">
                    <DecryptedText text={res.filename} speed={70} maxIterations={25} animateOn="hover" />
                  </p>
                  <p className="text-xs text-white font-semibold mb-1.5 cursor-crosshair">
                    <DecryptedText text={res.title} speed={70} maxIterations={30} animateOn="view" />
                  </p>
                  {res.colorPalette && (
                    <p className="text-[10px] text-blue-400 mb-1">🎨 {res.colorPalette}</p>
                  )}
                  
                  {/* Quality & Compliance Intelligence */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Deformation Score */}
                    {res.deformationScore !== undefined && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold ${
                        res.deformationScore <= 10 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        res.deformationScore <= 30 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                      }`}>
                        <span>{res.deformationScore <= 10 ? '✨' : res.deformationScore <= 30 ? '👀' : '👾'}</span>
                        <span>شذوذ AI: {res.deformationScore}%</span>
                      </div>
                    )}

                    {/* Estimated Acceptance */}
                    {res.estimatedAcceptance !== undefined && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold ${
                        res.estimatedAcceptance >= 90 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.2)]' :
                        res.estimatedAcceptance >= 70 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        <span>{res.estimatedAcceptance >= 90 ? '📈' : res.estimatedAcceptance >= 70 ? '📊' : '📉'}</span>
                        <span>فرصة القبول: {res.estimatedAcceptance}%</span>
                      </div>
                    )}
                    
                    {/* Legacy Compliance shield if no estimatedAcceptance */}
                    {!res.estimatedAcceptance && res.compliance && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold w-fit ${
                        res.compliance.status === 'safe' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        res.compliance.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      }`}>
                        <span className="text-xs">
                          {res.compliance.status === 'safe' ? '🛡️' : res.compliance.status === 'warning' ? '⚠️' : '🚫'}
                        </span>
                        <span>
                          {res.compliance.status === 'safe' ? 'آمن للرفع' : res.compliance.status === 'warning' ? 'تنبيه جودة' : 'خطر رفض مرتفع'}
                        </span>
                        <span className="opacity-40">|</span>
                        <span>{res.compliance.score}%</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Uniqueness Review */}
                  {res.uniquenessReview && (
                    <p className="text-[10px] text-accent mb-2 font-mono flex items-start gap-1">
                      <span className="shrink-0 text-amber-400">💡 الجودة التسويقية:</span> 
                      {res.uniquenessReview}
                    </p>
                  )}

                  {res.compliance?.issues && res.compliance.issues.length > 0 && (
                    <div className="mb-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                      <p className="text-[8px] uppercase font-bold text-red-400/60 mb-1 tracking-wider">مشاكل تم رصدها:</p>
                      <ul className="space-y-0.5">
                        {res.compliance.issues.map((issue, idx) => (
                          <li key={idx} className="text-[9px] text-red-400/90 flex items-start gap-1 leading-tight">
                            <span className="shrink-0">•</span> {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
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
        </details>
        </div>
      )}
    </div>
  );
}
