import { createClient } from "@supabase/supabase-js";

// نستخدم import.meta.env لأن المشروع مبني بـ Vite
// وضعنا مساراً افتراضياً لكي لا يتوقف التطبيق حتى تضع روابطك الخاصة في ملف .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbG...your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * دالة مساعدة للتحقق السريع: هل المستخدم يسجل كزائر أم يمتلك حساباً؟
 */
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return { isGuest: true, user: null };
    return {
      isGuest: !session,
      user: session?.user || null
    };
  } catch (error) {
    // في حالة عدم توفر اتصال بالإنترنت أو عدم صحة روابط Supabase
    return { isGuest: true, user: null };
  }
};
