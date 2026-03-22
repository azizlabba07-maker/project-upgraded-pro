import { useState, useEffect } from "react";
import { toast } from "sonner";

interface PortfolioEntry {
  id: string;
  title: string;
  category: string;
  type: "image" | "video";
  uploadDate: string;
  status: "pending" | "approved" | "rejected" | "selling";
  downloads: number;
  earnings: number;
  keywords: string;
  notes: string;
}

const CATEGORIES = [
  "Technology", "Business", "Wellness", "Sustainability", "Abstract",
  "Seasonal", "Nature", "Architecture", "Food", "Science", "Fashion", "Travel",
];

const STATUS_CONFIG = {
  pending:  { label: "⏳ قيد المراجعة", cls: "text-cyber-yellow border-cyber-yellow bg-cyber-yellow/10" },
  approved: { label: "✅ مقبول",        cls: "text-primary border-primary bg-primary/10" },
  rejected: { label: "❌ مرفوض",        cls: "text-destructive border-destructive bg-destructive/10" },
  selling:  { label: "💰 يُباع",         cls: "text-accent border-accent bg-accent/10" },
};

const STORAGE_KEY = "portfolio_entries_v1";

function loadEntries(): PortfolioEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveEntries(entries: PortfolioEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  catch {}
}

export default function PortfolioTracker() {
  const [entries, setEntries] = useState<PortfolioEntry[]>(loadEntries);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "earnings" | "downloads">("date");

  const [form, setForm] = useState<Omit<PortfolioEntry, "id">>({
    title: "", category: CATEGORIES[0], type: "image",
    uploadDate: new Date().toISOString().split("T")[0],
    status: "pending", downloads: 0, earnings: 0, keywords: "", notes: "",
  });

  useEffect(() => { saveEntries(entries); }, [entries]);

  const resetForm = () => {
    setForm({
      title: "", category: CATEGORIES[0], type: "image",
      uploadDate: new Date().toISOString().split("T")[0],
      status: "pending", downloads: 0, earnings: 0, keywords: "", notes: "",
    });
    setEditId(null);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان الملف"); return; }
    if (editId) {
      setEntries((prev) => prev.map((e) => e.id === editId ? { ...form, id: editId } : e));
      toast.success("تم تحديث الملف!");
    } else {
      const newEntry: PortfolioEntry = { ...form, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      setEntries((prev) => [newEntry, ...prev]);
      toast.success("تمت إضافة الملف!");
    }
    setShowForm(false);
    resetForm();
  };

  const handleEdit = (entry: PortfolioEntry) => {
    setForm({ title: entry.title, category: entry.category, type: entry.type,
      uploadDate: entry.uploadDate, status: entry.status, downloads: entry.downloads,
      earnings: entry.earnings, keywords: entry.keywords, notes: entry.notes });
    setEditId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("تم الحذف");
  };

  const filtered = entries
    .filter((e) => (!filterStatus || e.status === filterStatus) && (!filterCategory || e.category === filterCategory))
    .sort((a, b) => {
      if (sortBy === "earnings") return b.earnings - a.earnings;
      if (sortBy === "downloads") return b.downloads - a.downloads;
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    });

  // Stats
  const totalEarnings = entries.reduce((s, e) => s + e.earnings, 0);
  const totalDownloads = entries.reduce((s, e) => s + e.downloads, 0);
  const selling = entries.filter((e) => e.status === "selling").length;
  const approved = entries.filter((e) => e.status === "approved").length;

  const inputClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";
  const selectClass = inputClass;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { value: entries.length, label: "إجمالي الملفات", icon: "📁" },
          { value: `$${totalEarnings.toFixed(2)}`, label: "إجمالي الأرباح", icon: "💰" },
          { value: totalDownloads.toLocaleString(), label: "إجمالي التحميلات", icon: "⬇" },
          { value: selling + approved, label: "ملفات نشطة", icon: "✅" },
        ].map((stat, i) => (
          <div key={i} className="bg-primary/5 border-2 border-primary rounded-lg p-4 text-center box-glow">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-extrabold text-primary text-glow font-mono">{stat.value}</div>
            <div className="text-xs text-secondary mt-1 font-mono">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-card border-2 border-primary rounded-lg p-4 box-glow flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الحالة:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
            <option value="">الكل</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الفئة:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="">الكل</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-primary text-[10px] font-semibold font-mono block mb-1">ترتيب حسب:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className={selectClass}>
            <option value="date">التاريخ</option>
            <option value="earnings">الأرباح</option>
            <option value="downloads">التحميلات</option>
          </select>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all"
        >
          ➕ إضافة ملف
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold animate-fade-in">
          <h3 className="text-base font-semibold text-accent font-mono mb-4">
            {editId ? "✏️ تعديل الملف" : "➕ إضافة ملف جديد"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">عنوان الملف:</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: Abstract AI Neural Network" className={inputClass} />
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الفئة:</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={selectClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">النوع:</label>
              <div className="flex gap-2">
                {(["image", "video"] as const).map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                      form.type === t ? "gradient-primary text-primary-foreground border-primary" : "bg-card text-secondary border-primary/40"
                    }`}>
                    {t === "image" ? "📷 صورة" : "🎬 فيديو"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">تاريخ الرفع:</label>
              <input type="date" value={form.uploadDate} onChange={(e) => setForm((f) => ({ ...f, uploadDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الحالة:</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))} className={selectClass}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">التحميلات:</label>
              <input type="number" min={0} value={form.downloads} onChange={(e) => setForm((f) => ({ ...f, downloads: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الأرباح ($):</label>
              <input type="number" min={0} step={0.01} value={form.earnings} onChange={(e) => setForm((f) => ({ ...f, earnings: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">الكلمات المفتاحية:</label>
              <input value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} placeholder="AI, technology, abstract..." className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="text-primary text-[10px] font-semibold font-mono block mb-1">ملاحظات:</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية..." className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all">
              {editId ? "💾 حفظ التعديلات" : "✅ إضافة الملف"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="bg-card border-2 border-primary text-primary px-5 py-2.5 rounded-md font-mono text-xs font-semibold hover:bg-primary/10 transition-all">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Portfolio List */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">
          📁 المحفظة ({filtered.length} ملف)
        </h3>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-secondary font-mono text-sm">
            {entries.length === 0 ? "لم تضف أي ملفات بعد. اضغط ➕ إضافة ملف للبدء." : "لا توجد نتائج مطابقة للفلاتر."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-primary">
                  {["العنوان", "الفئة", "النوع", "الحالة", "التحميلات", "الأرباح", "التاريخ", ""].map((h) => (
                    <th key={h} className="text-right p-2 text-primary font-semibold text-glow">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} className="border-b border-primary/20 hover:bg-primary/5 transition-colors group">
                    <td className="p-2 text-secondary max-w-[180px]">
                      <div className="truncate" title={entry.title}>{entry.title}</div>
                      {entry.notes && <div className="text-[9px] text-secondary/60 truncate">{entry.notes}</div>}
                    </td>
                    <td className="p-2 text-secondary">{entry.category}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded border text-[9px] ${
                        entry.type === "video" ? "text-cyber-blue border-cyber-blue bg-cyber-blue/10" : "text-primary border-primary bg-primary/10"
                      }`}>
                        {entry.type === "video" ? "🎬 فيديو" : "📷 صورة"}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded border text-[9px] ${STATUS_CONFIG[entry.status].cls}`}>
                        {STATUS_CONFIG[entry.status].label}
                      </span>
                    </td>
                    <td className="p-2 text-secondary font-semibold">{entry.downloads.toLocaleString()}</td>
                    <td className="p-2 text-accent font-semibold">${entry.earnings.toFixed(2)}</td>
                    <td className="p-2 text-secondary">{entry.uploadDate}</td>
                    <td className="p-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(entry)} className="text-[10px] px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-all">✏️</button>
                        <button onClick={() => handleDelete(entry.id)} className="text-[10px] px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly breakdown */}
      {entries.length > 0 && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">📊 توزيع الأرباح حسب الحالة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
              const group = entries.filter((e) => e.status === status);
              const groupEarnings = group.reduce((s, e) => s + e.earnings, 0);
              return (
                <div key={status} className={`rounded-lg p-3 border ${STATUS_CONFIG[status].cls}`}>
                  <div className="text-[10px] font-mono mb-1">{STATUS_CONFIG[status].label}</div>
                  <div className="text-lg font-extrabold font-mono">{group.length}</div>
                  <div className="text-[10px] font-mono opacity-80">${groupEarnings.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
