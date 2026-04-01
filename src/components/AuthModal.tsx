import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح! يتم الآن تفعيل الحفظ السحابي ☁️");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! السحابة معدة الآن.");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء المصادقة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden group">
        {/* Animated background accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 z-10"
        >
          ✕
        </button>
 
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              💎
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              {isLogin 
                ? "مرحباً بك مجدداً! ادخل لمزامنة بياناتك والحصول على تنبيهات الفرص الحية." 
                : "انضم إلى مجتمع المحترفين وابدأ في تتبع محفظتك وحفظ برومبتاتك في السحابة."}
            </p>
          </div>
 
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white p-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                placeholder="name@company.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white p-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
 
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6 overflow-hidden relative"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                isLogin ? "🚀 دخول النظام" : "✨ إنشاء الحساب"
              )}
            </button>
          </form>
 
          <div className="mt-8 text-center pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 mx-auto group"
            >
              {isLogin ? (
                <>ليس لديك حساب؟ <span className="text-blue-400 font-bold group-hover:underline">سجل الآن</span></>
              ) : (
                <>لديك حساب بالفعل؟ <span className="text-blue-400 font-bold group-hover:underline">سجل دخولك</span></>
              )}
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-all"
            >
              المتابعة كزائر (بدء تجربة محدودة)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
