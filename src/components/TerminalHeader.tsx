import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import { checkAuthStatus, supabase } from "@/lib/supabase";
import { toast } from "sonner";

const tabs = [
  { id: "market",     label: "📊 تحليل السوق" },
  { id: "opportunity",label: "🧠 محرك الفرص" },
  { id: "generator",  label: "🤖 المولد الموحد (Gemini + Claude)" },
  { id: "dashboard",  label: "📈 لوحة القيادة" },
  { id: "tools",      label: "🛠️ أدوات" },
  { id: "store",      label: "🔍 محلل المتجر" },
  { id: "inspiration", label: "💡 إلهام" },
  { id: "settings",   label: "⚙️ الإعدادات" },
];

interface TerminalHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TerminalHeader({ activeTab, onTabChange }: TerminalHeaderProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus().then(res => setUser(res.user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        toast.success("تم تسجيل الخروج بنجاح. أنت الآن في وضع الزائر 🏠");
    } catch (e) {
        toast.error("حدث خطأ أثناء تسجيل الخروج");
    }
  };
  return (
    <>
      <div className="sticky top-0 z-50 bg-muted border-b-2 border-primary px-5 py-3 flex items-center gap-3 box-glow-strong">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-cyber-red" />
          <div className="w-3 h-3 rounded-full bg-cyber-yellow" />
          <div className="w-3 h-3 rounded-full bg-primary" />
        </div>
        <div className="flex-1 text-center text-xs text-primary text-glow font-mono flex items-center justify-center gap-4">
          <span>$ stock_market_intelligence --v3.0 --hybrid-cloud</span>
          {user ? (
            <div className="flex items-center gap-3 ml-auto mr-4 text-[10px] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              <span className="text-secondary">👤 {user.email}</span>
              <button onClick={handleLogout} className="text-destructive hover:text-destructive/80 font-bold transition-colors">تسجيل الخروج</button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="ml-auto mr-4 text-[10px] px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold hover:bg-accent/30 transition-all box-glow-gold"
            >
              ☁️ تفعيل السحابة (Login)
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-5 pt-5">
        <div className="text-center mb-8 p-8 gradient-header border-2 border-primary rounded-lg box-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/10 to-transparent scanline-animation pointer-events-none" />
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-glow-strong relative z-10 font-arabic">
            ⚡ STOCK MARKET INTELLIGENCE PRO ✨
          </h1>
          <p className="text-sm text-secondary relative z-10 mt-2 font-mono">
            {">>> محلل سوق Adobe Stock الذكي | Gemini + Claude AI | v2.1 <<<"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-primary pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2.5 rounded-md text-xs font-semibold font-mono transition-all duration-300 border-2 ${
                activeTab === tab.id
                  ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                  : "bg-card text-secondary border-primary hover:bg-primary/10 hover:box-glow"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => setIsAuthOpen(false)} 
      />
    </>
  );
}
