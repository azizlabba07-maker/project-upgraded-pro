import { useState } from "react";
import {
  addUserGeminiApiKey,
  getUserGeminiApiKey,
  getUserGeminiApiKeys,
  removeUserGeminiApiKey,
  setUserGeminiApiKey,
  validateGeminiApiKey,
} from "@/lib/gemini";
import { getClaudeApiKey, setClaudeApiKey, validateClaudeKey, isClaudeProxyEnabled } from "@/lib/claude";
import { toast } from "sonner";

export default function ApiKeySettings() {
  const [geminiKey, setGeminiKeyState] = useState(getUserGeminiApiKey());
  const [geminiKeys, setGeminiKeys] = useState<string[]>(getUserGeminiApiKeys());
  const [showGemini, setShowGemini] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [claudeKey, setClaudeKeyState] = useState(getClaudeApiKey());
  const [showClaude, setShowClaude] = useState(false);
  const [savingClaude, setSavingClaude] = useState(false);
  const [claudeResult, setClaudeResult] = useState<{ ok: boolean; message: string } | null>(null);
  const proxyEnabled = isClaudeProxyEnabled();

  const notifyKeyUpdated = (hasKey: boolean) => {
    window.dispatchEvent(new CustomEvent("gemini-key-updated", { detail: { hasKey } }));
  };

  const handleAddGeminiKey = async () => {
    const trimmed = geminiKey.trim();
    if (!trimmed) return;
    setSavingGemini(true);
    try {
      const v = await validateGeminiApiKey(trimmed);
      setGeminiResult(v);
      if (!v.ok && !v.message.includes("صالح")) { toast.error(v.message); return; }
      const added = addUserGeminiApiKey(trimmed);
      if (!added.added) {
        if (added.reason === "exists") {
          toast.error("هذا المفتاح مضاف بالفعل.");
        } else if (added.reason === "limit") {
          toast.error("الحد الأقصى 10 مفاتيح Gemini.");
        } else {
          toast.error("تعذر إضافة المفتاح.");
        }
        return;
      }
      setGeminiKeys(getUserGeminiApiKeys());
      setGeminiKeyState("");
      notifyKeyUpdated(true);
      toast.success("✅ تم إضافة API جديد لـ Gemini!");
    } finally { setSavingGemini(false); }
  };

  const handleSaveClaude = async () => {
    const trimmed = claudeKey.trim();
    if (proxyEnabled && !trimmed) {
      setClaudeResult({ ok: true, message: "✅ Proxy mode مفعّل. لا يلزم مفتاح Claude داخل المتصفح." });
      toast.success("Proxy mode مفعّل لـ Claude.");
      return;
    }
    if (!trimmed) { setClaudeApiKey(""); setClaudeKeyState(""); setClaudeResult(null); toast.success("تم إزالة مفتاح Claude."); return; }
    setSavingClaude(true);
    try {
      const v = await validateClaudeKey(trimmed);
      setClaudeResult(v);
      if (!v.ok) { toast.error(v.message); return; }
      setClaudeApiKey(trimmed); toast.success("✅ تم حفظ مفتاح Claude API!");
    } finally { setSavingClaude(false); }
  };

  const inputClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Gemini Key */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow space-y-4">
        <h3 className="text-base font-semibold text-primary text-glow font-mono">🔑 Gemini API Key</h3>
        <div className="bg-primary/5 border border-primary/30 rounded-md p-4 space-y-2">
          <p className="text-secondary font-mono text-xs">مطلوب لـ: تحليل السوق، تحديث التراندات، مولد البرومبتات الأساسي.</p>
          <ol className="text-secondary font-mono text-[11px] list-decimal list-inside space-y-1">
            <li>افتح <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a></li>
            <li>سجل الدخول بحساب Google</li>
            <li>اضغط "Create API Key" وانسخه هنا</li>
          </ol>
          <div className="bg-destructive/10 border border-destructive/30 rounded p-2">
            <p className="text-destructive font-mono text-[10px]">⚡ إذا ظهر خطأ 403، أزل قيود HTTP referrer من Google Cloud Console</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input type={showGemini ? "text" : "password"} value={geminiKey} onChange={(e) => setGeminiKeyState(e.target.value)} placeholder="AIzaSy..." className={inputClass} dir="ltr" />
          <button
            onClick={handleAddGeminiKey}
            disabled={savingGemini || !geminiKey.trim()}
            className="gradient-primary text-primary-foreground px-3 rounded-md text-sm font-mono font-semibold transition-all shrink-0 disabled:opacity-40"
            aria-label="إضافة API جديد لـ Gemini"
            title="إضافة API جديد"
          >
            +
          </button>
          <button onClick={() => setShowGemini(!showGemini)} className="bg-card border-2 border-primary text-primary px-3 rounded-md text-xs font-mono hover:bg-primary/10 transition-all shrink-0">{showGemini ? "🙈" : "👁️"}</button>
        </div>
        {geminiKeys.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {geminiKeys.map((key, index) => (
              <button
                key={`${key}-${index}`}
                type="button"
                onClick={() => {
                  removeUserGeminiApiKey(key);
                  const next = getUserGeminiApiKeys();
                  setGeminiKeys(next);
                  if (next.length === 0) notifyKeyUpdated(false);
                  toast.success("تم حذف مفتاح Gemini.");
                }}
                className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                title="حذف هذا المفتاح"
              >
                API {index + 1} • {key.slice(0, 8)}...{key.slice(-4)} ×
              </button>
            ))}
          </div>
        )}
        {geminiResult && <div className={`rounded-md p-2.5 font-mono text-xs border ${geminiResult.ok ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>{geminiResult.message}</div>}
        <div className="flex gap-3">
          <button onClick={handleAddGeminiKey} disabled={savingGemini || !geminiKey.trim()} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-40">{savingGemini ? "⏳ جارِ الإضافة..." : "💾 إضافة Gemini API"}</button>
          {geminiKeys.length > 0 && <button onClick={() => { setGeminiKeyState(""); setUserGeminiApiKey(""); setGeminiKeys([]); setGeminiResult(null); notifyKeyUpdated(false); toast.success("تمت إزالة كل مفاتيح Gemini."); }} className="bg-card border-2 border-destructive text-destructive px-4 py-2.5 rounded-md font-mono text-xs font-semibold hover:bg-destructive/10 transition-all">🗑️</button>}
        </div>
      </div>

      {/* Claude Key */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold space-y-4">
        <h3 className="text-base font-semibold text-accent text-glow-gold font-mono">✦ Claude API Key</h3>
        <div className="bg-accent/5 border border-accent/30 rounded-md p-4 space-y-2">
          <p className="text-secondary font-mono text-xs">مطلوب لـ: مولد البرومبتات المتقدم، SEO Bundle، الكلمات المفتاحية المتقدمة.</p>
          {proxyEnabled && (
            <div className="bg-primary/10 border border-primary/30 rounded p-2">
              <p className="text-primary font-mono text-[10px]">
                ✅ Proxy mode مفعّل: الطلبات تمر عبر Backend آمن، لذلك لا تحتاج وضع مفتاح Claude هنا.
              </p>
            </div>
          )}
          <ol className="text-secondary font-mono text-[11px] list-decimal list-inside space-y-1">
            <li>افتح <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-accent underline">Anthropic Console</a></li>
            <li>سجل الدخول أو أنشئ حساباً مجانياً</li>
            <li>اذهب إلى Settings → API Keys → Create Key</li>
          </ol>
        </div>
        <div className="flex gap-2">
          <input type={showClaude ? "text" : "password"} value={claudeKey} onChange={(e) => setClaudeKeyState(e.target.value)} placeholder="sk-ant-api03-..." className={inputClass} dir="ltr" />
          <button onClick={() => setShowClaude(!showClaude)} className="bg-card border-2 border-accent text-accent px-3 rounded-md text-xs font-mono hover:bg-accent/10 transition-all shrink-0">{showClaude ? "🙈" : "👁️"}</button>
        </div>
        {claudeResult && <div className={`rounded-md p-2.5 font-mono text-xs border ${claudeResult.ok ? "bg-accent/10 border-accent/30 text-accent" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>{claudeResult.message}</div>}
        <div className="flex gap-3">
          <button onClick={handleSaveClaude} disabled={savingClaude || (!proxyEnabled && !claudeKey.trim())} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-40">{savingClaude ? "⏳ جارِ الحفظ..." : proxyEnabled ? "🛡️ تفعيل Proxy Mode" : "💾 حفظ Claude Key"}</button>
          {getClaudeApiKey() && <button onClick={() => { setClaudeKeyState(""); setClaudeApiKey(""); setClaudeResult(null); toast.success("تم الإزالة."); }} className="bg-card border-2 border-destructive text-destructive px-4 py-2.5 rounded-md font-mono text-xs font-semibold hover:bg-destructive/10 transition-all">🗑️</button>}
        </div>
      </div>

      {/* Status */}
      <div className="bg-card border-2 border-primary rounded-lg p-4 box-glow">
        <h4 className="text-sm font-semibold text-primary font-mono mb-3">📊 حالة المفاتيح</h4>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className={geminiKeys.length > 0 ? "text-primary" : "text-destructive"}>{geminiKeys.length > 0 ? "✅" : "⚠️"}</span>
            <span className="text-secondary">Gemini: {geminiKeys.length > 0 ? `مفعّل — ${geminiKeys.length} API` : "غير مفعّل"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={(proxyEnabled || getClaudeApiKey()) ? "text-accent" : "text-destructive"}>{(proxyEnabled || getClaudeApiKey()) ? "✅" : "⚠️"}</span>
            <span className="text-secondary">Claude: {proxyEnabled ? "Proxy mode مفعّل — Backend آمن" : getClaudeApiKey() ? "مفعّل — المولد المتقدم، SEO Bundle" : "غير مفعّل"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
