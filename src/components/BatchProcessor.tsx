import { useState, useCallback, useRef } from "react";
import { analyzeImageForStock, hasAnyApiKey, getUserGeminiApiKeys, type ImageAnalysisResult } from "@/lib/gemini";
import { toast } from "sonner";
import { exportCsvFile, copyTextSafely } from "@/lib/shared";

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
    const concurrency = Math.max(1, Math.min(apiKeys.length, 5)); // Cap at 5 lanes
    const delayPerKey = 4000; // 4s between requests per key (safe for free tier)

    const total = files.length;
    const startTime = Date.now();
    let completed = 0;
    let errors = 0;

    setStats({
      completed: 0, total, errors: 0,
      activeLanes: 0, maxLanes: concurrency,
      eta: "جاري الحساب...", startTime,
    });

    const newResults: ImageAnalysisResult[] = new Array(total).fill(null);

    // Process a single file
    const processFile = async (index: number) => {
      if (cancelRef.current) return;

      const file = files[index];
      setCurrentFiles((prev) => [...prev, file.name]);

      try {
        let base64: string;
        let isPanorama = false;

        if (file.type.startsWith("video/")) {
          // 🎬 Extract 3-frame panorama collage
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
        const rate = completed / elapsed;
        const remaining = total - completed;
        const etaSeconds = rate > 0 ? remaining / rate : 0;

        setStats({
          completed, total, errors,
          activeLanes: Math.min(concurrency, total - completed),
          maxLanes: concurrency,
          eta: formatEta(etaSeconds),
          startTime,
        });

        // Update results progressively
        setResults([...newResults.filter(Boolean)]);
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
        // Rate limit delay (skip for last file)
        if (i < total - 1 && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, delayPerKey));
        }
      }
    } else {
      // 🚀 Concurrent mode (multiple keys)
      // Create lanes - each lane processes its share of files sequentially
      const lanes: number[][] = Array.from({ length: concurrency }, () => []);
      for (let i = 0; i < total; i++) {
        lanes[i % concurrency].push(i);
      }

      const lanePromises = lanes.map(async (fileIndices, laneIndex) => {
        for (let j = 0; j < fileIndices.length; j++) {
          if (cancelRef.current) break;

          // Stagger lane starts to avoid burst
          if (j === 0 && laneIndex > 0) {
            await new Promise((r) => setTimeout(r, laneIndex * 800));
          }

          await processFile(fileIndices[j]);

          // Rate limit delay per lane
          if (j < fileIndices.length - 1 && !cancelRef.current) {
            await new Promise((r) => setTimeout(r, delayPerKey));
          }
        }
      });

      await Promise.all(lanePromises);
    }

    // Final state
    const finalResults = newResults.filter(Boolean);
    setResults(finalResults);
    setStats((prev) => ({ ...prev, activeLanes: 0, eta: "—" }));
    setProcessing(false);
    setCurrentFiles([]);

    // Persist results
    try {
      localStorage.setItem("batch_processor_results", JSON.stringify(finalResults));
    } catch {}

    const successCount = finalResults.filter((r) => !r.title.startsWith("[Error]")).length;
    if (cancelRef.current) {
      toast.info(`⏹️ تم الإيقاف — ${successCount} ناجحة من ${completed} معالَجة`);
    } else {
      toast.success(`✅ تم تحليل ${successCount}/${total} ملف بنجاح!`);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    toast.info("⏹️ جاري الإيقاف...");
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
              {/* Show concurrency info */}
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
      {files.length > 0 && !processing && results.length === 0 && (
        <button
          onClick={handleProcess}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-blue-500/20"
        >
          🚀 ابدأ التحليل الجماعي ({files.length} ملف) — {Math.max(1, Math.min(getUserGeminiApiKeys().length, 5))} مسارات
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
