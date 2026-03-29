import { useState, useMemo } from "react";
import {
  getPromptHistory,
  togglePromptFavorite,
  deletePromptHistoryEntry,
  clearPromptHistory,
  type PromptHistoryEntry,
} from "@/lib/shared";
import { copyTextSafely, exportCsvFile } from "@/lib/shared";
import { toast } from "sonner";

export default function PromptHistory() {
  const [history, setHistory] = useState<PromptHistoryEntry[]>(getPromptHistory);
  const [filter, setFilter] = useState<"all" | "favorite">("all");
  const [engineFilter, setEngineFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  const refresh = () => setHistory(getPromptHistory());

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (filter === "favorite" && !h.favorite) return false;
      if (engineFilter && h.engine !== engineFilter) return false;
      if (categoryFilter && h.category !== categoryFilter) return false;
      if (search && !h.prompt.toLowerCase().includes(search.toLowerCase()) && !h.title?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [history, filter, engineFilter, categoryFilter, search]);

  const engines = [...new Set(history.map((h) => h.engine))];
  const categories = [...new Set(history.map((h) => h.category))];

  const handleToggleFav = (id: string) => {
    togglePromptFavorite(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deletePromptHistoryEntry(id);
    refresh();
    toast.success("تم الحذف");
  };

  const handleClear = () => {
    if (!confirm("هل أنت متأكد من حذف كل السجل؟")) return;
    clearPromptHistory();
    refresh();
    toast.success("تم مسح السجل");
  };

  const handleCopy = async (text: string) => {
    const ok = await copyTextSafely(text);
    if (ok) toast.success("تم النسخ!");
    else toast.error("تعذر النسخ");
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("لا توجد بيانات"); return; }
    exportCsvFile(
      `prompt-history-${Date.now()}.csv`,
      ["#", "Engine", "Category", "Type", "Title", "Keywords", "Prompt", "Date", "Favorite"],
      filtered.map((h, i) => [
        String(i + 1),
        h.engine,
        h.category,
        h.type,
        h.title || "",
        (h.keywords || []).join(" | "),
        h.prompt,
        new Date(h.timestamp).toLocaleDateString("ar-EG"),
        h.favorite ? "⭐" : "",
      ])
    );
    toast.success("تم التصدير");
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("ar-EG") + " " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  const engineColors: Record<string, string> = {
    gemini: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    claude: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    openai: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    local: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">📜 سجل البرومبتات</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {history.length} برومبت محفوظ • {history.filter(h => h.favorite).length} مفضلة
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all">
              ⬇ تصدير CSV
            </button>
            {history.length > 0 && (
              <button onClick={handleClear} className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all">
                🗑️ مسح الكل
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
            {(["all", "favorite"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  filter === f ? "bg-blue-500/15 text-blue-400" : "text-slate-500 hover:text-white bg-white/[0.02]"
                }`}
              >
                {f === "all" ? "الكل" : "⭐ المفضلة"}
              </button>
            ))}
          </div>
          <select value={engineFilter} onChange={(e) => setEngineFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 px-3 py-1.5 rounded-xl">
            <option value="">كل المحركات</option>
            {engines.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 px-3 py-1.5 rounded-xl">
            <option value="">كل الفئات</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث..."
            className="bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-1.5 rounded-xl flex-1 min-w-[150px] placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
          <span className="text-4xl mb-4 block">📭</span>
          <p className="text-sm text-slate-500">لا توجد برومبتات محفوظة بعد</p>
          <p className="text-[10px] text-slate-700 mt-1">ستُحفظ البرومبتات تلقائياً عند توليدها من المولد الموحد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleFav(entry.id)}
                  className={`mt-1 text-lg transition-transform hover:scale-125 ${entry.favorite ? "text-amber-400" : "text-slate-700 hover:text-slate-500"}`}
                >
                  {entry.favorite ? "⭐" : "☆"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${engineColors[entry.engine] || engineColors.local}`}>
                      {entry.engine}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500">
                      {entry.category}
                    </span>
                    {entry.type && (
                      <span className="text-[10px] text-slate-600">{entry.type === "video" ? "🎬" : "📷"} {entry.type}</span>
                    )}
                    <span className="text-[9px] text-slate-700 mr-auto">{formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.title && (
                    <div className="text-xs text-blue-400 font-semibold mb-1">📌 {entry.title}</div>
                  )}
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{entry.prompt}</p>
                  {entry.keywords && entry.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.keywords.slice(0, 8).map((kw, ki) => (
                        <span key={ki} className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-500 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                      {entry.keywords.length > 8 && <span className="text-[9px] text-slate-600">+{entry.keywords.length - 8}</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => handleCopy(entry.prompt)} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-blue-500/15 text-slate-500 hover:text-blue-400 flex items-center justify-center text-sm transition-all" title="نسخ">
                    📋
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/15 text-slate-500 hover:text-red-400 flex items-center justify-center text-sm transition-all" title="حذف">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
