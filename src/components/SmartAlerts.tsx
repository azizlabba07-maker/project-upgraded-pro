import { useApp } from "@/contexts/AppContext";
import { getRelativeTime } from "@/lib/shared";

export default function SmartAlerts({ onClose }: { onClose: () => void }) {
  const { alerts, markAlertRead, clearAlerts } = useApp();

  const typeConfig = {
    gold: { icon: "⭐", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    trend: { icon: "📈", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    api: { icon: "⚙️", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    info: { icon: "💡", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  };

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="absolute top-[60px] left-4 w-96 max-h-[70vh] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            🔔 التنبيهات
            {alerts.filter(a => !a.read).length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {alerts.filter(a => !a.read).length} جديد
              </span>
            )}
          </h3>
          {alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
            >
              مسح الكل
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="overflow-y-auto max-h-[calc(70vh-60px)] custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600">
              <span className="text-3xl mb-3">🔕</span>
              <p className="text-sm">لا توجد تنبيهات حالياً</p>
              <p className="text-[10px] mt-1">ستظهر التنبيهات عند اكتشاف فرص جديدة</p>
            </div>
          ) : (
            <div className="py-2">
              {alerts.map((alert) => {
                const config = typeConfig[alert.type];
                return (
                  <button
                    key={alert.id}
                    onClick={() => markAlertRead(alert.id)}
                    className={`w-full text-right px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors flex items-start gap-3 ${
                      !alert.read ? "bg-white/[0.02]" : ""
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center text-sm shrink-0 mt-0.5`}>
                      {config.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${config.color}`}>{alert.title}</span>
                        {!alert.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
                      <p className="text-[9px] text-slate-700 mt-1">
                        {getRelativeTime(new Date(alert.timestamp))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
