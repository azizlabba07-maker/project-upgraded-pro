import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyModal({ open, onOpenChange }: InfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✨</span> نظام التحليل الذكي
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-2">
            كيف يعمل معالج Adobe Stock Batch Pro؟
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="text-sm font-bold text-blue-400 mb-1">🔗 تحليل تلقائي بالكامل</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              لا يتطلب هذا النظام إدخال أي مفاتيح API يدوية. التحليل يتم عبر اتصال مشفر ومؤمن بخوادم Gemini AI الخاصة بالمشروع لضمان أقصى أداء واستمرارية.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="text-lg mb-1">⚡</div>
              <div className="text-[10px] font-bold">سرعة عالية</div>
              <div className="text-[9px] text-slate-500">معالجة دفعات متزامنة</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="text-lg mb-1">🎯</div>
              <div className="text-[10px] font-bold">دقة Adobe</div>
              <div className="text-[9px] text-slate-500">تدريب مخصص لرفض Stock</div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 text-center italic">
            "نحن نهتم بالتفاصيل، لتهتم أنت بالإبداع"
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
