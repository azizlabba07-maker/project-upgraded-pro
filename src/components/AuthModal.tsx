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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card border-2 border-primary rounded-xl w-full max-w-md p-6 box-glow-strong relative overflow-hidden">
        {/* Background scanline */}
        <div className="absolute inset-0 bg-primary/5 scanline-animation pointer-events-none" />
        
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-secondary hover:text-primary transition-colors text-xl font-bold font-mono z-10"
        >
          ×
        </button>

        <div className="relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-primary font-mono mb-2 text-glow">
              {isLogin ? "تسجيل الدخول السحابي" : "حساب سحابي جديد"}
            </h2>
            <p className="text-sm text-secondary font-mono">
              فعّل الحفظ السحابي الآمن لبياناتك للحفاظ عليها ومزامنتها.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-primary text-xs font-semibold font-mono mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-primary/50 text-foreground p-3 rounded font-mono text-sm focus:outline-none focus:border-primary focus:box-glow transition-all"
                placeholder="developer@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-primary text-xs font-semibold font-mono mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-primary/50 text-foreground p-3 rounded font-mono text-sm focus:outline-none focus:border-primary focus:box-glow transition-all"
                placeholder="********"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-bold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? "⏳ جاري الاتصال بالخادم..." : isLogin ? "🚀 تسجيل الدخول" : "✨ إنشاء حساب"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-secondary hover:text-primary font-mono transition-colors border-b border-transparent hover:border-primary pb-0.5"
            >
              {isLogin ? "لا تملك حساباً؟ أنشئ حساباً جديداً" : "لديك حساب بالفعل؟ سجل دخولك"}
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-primary/20 text-center">
            <p className="text-[10px] text-secondary/70 font-mono">
              يمكنك المتابعة بـ <span className="text-primary font-bold">وضع الزائر</span> في أي وقت عن طريق إغلاق هذه النافذة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
