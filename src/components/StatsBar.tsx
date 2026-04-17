import React from "react";
import ShinyText from "./animations/ShinyText";
import { AnalysisResult } from "@/types";

interface StatsBarProps {
  results: AnalysisResult[];
  onExport: () => void;
  onClear: () => void;
  onFilterRisk: (filter: boolean) => void;
  riskFilter: boolean;
  onAutoFilter: () => void;
}

export default function StatsBar({
  results,
  onExport,
  onClear,
  onFilterRisk,
  riskFilter,
  onAutoFilter
}: StatsBarProps) {
  const successList = results.filter(r => !r.title.startsWith("[Error]"));
  
  const accepted = successList.filter(r => 
    (r.adobeReadinessScore !== undefined ? r.adobeReadinessScore >= 80 : true)
  );

  const perfectQualityCount = successList.filter(r => 
    (r.estimatedAcceptance !== undefined ? r.estimatedAcceptance >= 95 : false)
  ).length;

  const highRiskCount = successList.filter(r => 
    (r.adobeReadinessScore !== undefined ? r.adobeReadinessScore < 55 : false)
  ).length;

  const avgAcceptance = successList.length > 0 
    ? Math.round(successList.reduce((acc, r) => acc + (r.estimatedAcceptance || 0), 0) / successList.length) 
    : 0;

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
      <h3 className="text-lg font-bold mb-5 flex items-center gap-2 relative z-10">
        <span>📊</span> <ShinyText text="تقرير فحص الجودة الشامل" speed={4} />
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {successList.length} <span className="text-xs text-slate-500">/ {results.length}</span>
          </div>
          <div className="text-[10px] text-slate-400">تم تحليله بنجاح</div>
        </div>
        
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{accepted.length}</div>
          <div className="text-[10px] text-green-500/70">مقبول آلياً ({" >=80 "})</div>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">{perfectQualityCount}</div>
          <div className="text-[10px] text-blue-500/70">جودة استثنائية</div>
        </div>
        
        <button 
          onClick={() => onFilterRisk(!riskFilter)}
          className={`bg-red-500/10 border ${riskFilter ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] scale-105' : 'border-red-500/20'} rounded-2xl p-4 text-center cursor-pointer hover:bg-red-500/20 transition-all`}
        >
          <div className="text-2xl font-bold text-red-400 mb-1">{highRiskCount}</div>
          <div className="text-[10px] text-red-400/70">{riskFilter ? "إلغاء الفلتر" : "الملفات الخطرة"}</div>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between mt-2 pt-4 border-t border-white/10 relative z-10 gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onAutoFilter} className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all shadow-lg shadow-orange-500/10">
            🧹 تصفية المرفوض ({successList.length - accepted.length})
          </button>
          <button onClick={onExport} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold hover:scale-105 transition-all">
            📥 تصدير CSV (Adobe Ready)
          </button>
          <button onClick={onClear} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all">
            🗑️ مسح الكل
          </button>
        </div>
        
        <div className="flex gap-4">
          <div className="text-xs font-bold text-slate-400 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
            متوسط القبول: <span className="text-blue-400 ml-1">{avgAcceptance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
