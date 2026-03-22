# 🚀 دليل النشر السريع - Adobe Stock AI Partner v2.1.0

## ⚡ خطوات النشر في 5 دقائق

### 1. تحميل الملفات المحدثة
```
📁 الملف: adobe-stock-ai-partner-updated.zip
📍 الموقع: d:\ADOBE\New folder (5)\adobe-stock-ai-partner-v2\
```

### 2. الوصول إلى Lovable
```
🔗 https://lovable.dev/projects/3f9a2272-3727-423b-9b62-355d2d301e0c
```

### 3. استبدال الملفات
- احذف جميع الملفات القديمة
- ارفع محتويات المجلد `project-upgraded`
- تأكد من رفع مجلد `supabase` كاملاً

### 4. إعداد Supabase (اختياري للميزات المتقدمة)
```bash
# في terminal محلي أو Supabase CLI
supabase functions deploy claude-proxy
supabase functions deploy market-pulse

# إضافة الأسرار
supabase secrets set CLAUDE_API_KEY="your_key_here"
supabase secrets set CLAUDE_PROXY_TOKEN="secure_token"
```

### 5. متغيرات البيئة في Lovable
```
VITE_GEMINI_API_KEY=AIzaSyB... (مفتاح Gemini)
VITE_CLAUDE_PROXY_URL=https://xxx.supabase.co/functions/v1/claude-proxy
VITE_CLAUDE_PROXY_TOKEN=your_token
VITE_MARKET_PULSE_URL=https://xxx.supabase.co/functions/v1/market-pulse
```

### 6. النشر
- اضغط **"Deploy"** في Lovable
- انتظر 2-3 دقائق
- الموقع جاهز: https://adobe-stock-ai-hub.lovable.app/

## ✅ قائمة فحص ما قبل النشر

- [ ] جميع الملفات مرفوعة
- [ ] متغيرات البيئة مضافة
- [ ] Supabase functions منشورة (اختياري)
- [ ] اختبار محلي ناجح (`npm run build`)
- [ ] لا توجد أخطاء في Console

## 🎯 الميزات الجديدة المضافة

### 🔥 الجديد في v2.1.0
- ⚡ **One-Click Opportunity** - برومبتات كاملة بضغطة واحدة
- 📊 **Auto Pulse** - تحديث تلقائي للسوق
- 💡 **Inspiration Lab** - مختبر الإلهام
- 🔒 **Claude Proxy** - حماية مفاتيح API
- 📋 **نسخ محسّن** - إصلاح مشكلة النسخ

### 🛠️ الإصلاحات
- إصلاح مشاكل RTL
- تحسين الأداء
- إصلاح CORS issues

## 🆘 استكشاف الأخطاء

### مشكلة: البناء يفشل
```bash
npm install
npm run build
```

### مشكلة: Supabase غير متصل
- تأكد من URL صحيح
- تحقق من الأسرار

### مشكلة: الميزات لا تعمل
- تحقق من متغيرات البيئة
- افتح Developer Console للأخطاء

## 📞 للمساعدة
إذا واجهت مشاكل، تأكد من:
1. جميع الملفات مرفوعة
2. متغيرات البيئة صحيحة
3. Supabase functions نشرت (إذا استخدمتها)

---
**الوقت المقدر:** 5-10 دقائق
**المطلوب:** حساب Lovable + مفاتيح API (اختياري)