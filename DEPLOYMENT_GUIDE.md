# دليل نشر Adobe Stock AI Partner v2 - الميزات المحدثة

## 📋 الملفات المحدثة والجديدة

### ✅ المكونات الرئيسية المحدثة
- `src/components/MarketAnalysis.tsx` - إضافة Auto Pulse + تحديث تلقائي
- `src/components/OneClickOpportunity.tsx` - توليد برومبتات بضغطة واحدة
- `src/components/PromptGenerator.tsx` - إصلاح مشكلة نسخ البرومبت
- `src/components/InspirationLab.tsx` - **جديد** - مختبر الإلهام
- `src/components/ApiKeySettings.tsx` - دعم Claude Proxy
- `src/components/Dashboard.tsx` - تحديثات حية للسوق

### ✅ المكتبات المحدثة
- `src/lib/claude.ts` - دعم Proxy mode + fallback
- `src/lib/gemini.ts` - نماذج متعددة مع fallback
- `src/lib/livePulse.ts` - **جديد** - تحديث تلقائي دوري
- `src/lib/adobeStockCompliance.ts` - **جديد** - قواعد Adobe

### ✅ البيانات والتكوين
- `src/data/adobeVideoInspiration.ts` - **جديد** - فئات فيديو
- `.env.example` - متغيرات البيئة المطلوبة

### ✅ Edge Functions (Supabase)
- `supabase/functions/claude-proxy/` - **جديد** - Proxy آمن لـ Claude
- `supabase/functions/market-pulse/` - **جديد** - جلب بيانات Google Trends

## 🚀 خطوات النشر على Lovable

### 1. الوصول إلى المشروع
```
https://lovable.dev/projects/3f9a2272-3727-423b-9b62-355d2d301e0c
```

### 2. تحديث الملفات
- قم بتحميل الملف: `adobe-stock-ai-partner-updated.zip`
- استبدل جميع الملفات في المشروع

### 3. إعداد Supabase (إذا لم يكن موجوداً)
```bash
# إنشاء مشروع Supabase جديد
supabase init
supabase start

# نشر Edge Functions
supabase functions deploy claude-proxy
supabase functions deploy market-pulse

# إضافة الأسرار
supabase secrets set CLAUDE_API_KEY="your_claude_key"
supabase secrets set CLAUDE_PROXY_TOKEN="your_token"
```

### 4. تحديث متغيرات البيئة
في لوحة تحكم Lovable، أضف:
```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_CLAUDE_PROXY_URL=https://your-project.supabase.co/functions/v1/claude-proxy
VITE_CLAUDE_PROXY_TOKEN=your_token
VITE_MARKET_PULSE_URL=https://your-project.supabase.co/functions/v1/market-pulse
```

### 5. النشر
- اضغط "Deploy" في Lovable
- انتظر اكتمال النشر
- اختبر الموقع: https://adobe-stock-ai-hub.lovable.app/

## 🎯 الميزات الجديدة المضافة

### ⚡ One-Click Opportunity
- توليد برومبتات كاملة بضغطة واحدة
- اختيار نوع المخرجات (صور/فيديو/كلاهما)
- تحليل سوق سريع
- قائمة امتثال Adobe

### 📊 Auto Pulse
- تحديث تلقائي للسوق كل 15-120 ثانية
- جلب بيانات من Google Trends
- مؤشرات حية للمصادر

### 💡 Inspiration Lab
- إلهام من فئات شائعة
- توسيع كلمات مفتاحية تلقائي
- لصق نتائج بحث يدوي

### 🔒 Claude Proxy
- حماية مفاتيح API
- تجنب CORS
- أمان محسن

## 🧪 اختبار الميزات

بعد النشر، اختبر:
1. ✅ تحليل السوق مع Auto Pulse
2. ✅ One-Click Opportunity
3. ✅ مولد البرومبتات (نسخ يعمل)
4. ✅ تبويب الإلهام
5. ✅ إعدادات API

## 📞 دعم
إذا واجهت مشاكل، تحقق من:
- Console logs في المتصفح
- Supabase functions logs
- متغيرات البيئة صحيحة

---
**تاريخ التحديث:** 21 مارس 2026
**الإصدار:** v2.1.0</content>
<parameter name="filePath">d:\ADOBE\New folder (5)\adobe-stock-ai-partner-v2\project-upgraded\DEPLOYMENT_GUIDE.md