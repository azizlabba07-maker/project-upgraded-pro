# 🚀 ثبيت الموقع على سيرفر دائم (مجاني)

لتجنب إغلاق الموقع عند إغلاق جهازك، انشر المشروع على سيرفر سحابي مجاني.

---

## ✅ الطريقة 1: Vercel (الأسهل — موصى بها)

### الخطوة 1: إنشاء حساب
- اذهب إلى [vercel.com](https://vercel.com) وسجّل دخولاً (يمكنك استخدام GitHub).

### الخطوة 2: رفع المشروع
1. اضغط **Add New** → **Project**
2. اختر **Import Git Repository** إذا كان المشروع على GitHub  
   **أو** اسحب مجلد المشروع إلى [vercel.com/new](https://vercel.com/new) (drag & drop)
3. إذا لم يكن لديك Git:
   - ثبّت [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
   - افتح الطرفية في مجلد المشروع واكتب: `vercel`
   - اتبع التعليمات (سجّل دخولاً ثم اضغط Enter للموافقة)

### الخطوة 3: النشر
- اضغط **Deploy** — ستحصل على رابط ثابت مثل:
  ```
  https://adobe-stock-ai-hub-xxxx.vercel.app
  ```

### تحديث الموقع لاحقاً
- إذا ربطت بـ GitHub: أي `git push` يحدث النشر تلقائياً
- مع Vercel CLI: نفّذ `vercel --prod` من مجلد المشروع

---

## ✅ الطريقة 2: Netlify

### الخطوة 1: إنشاء حساب
- اذهب إلى [netlify.com](https://netlify.com) وسجّل دخولاً.

### الخطوة 2: رفع المشروع
1. من لوحة التحكم: **Add new site** → **Import an existing project**
2. اختر **Deploy manually** (إذا لم تستخدم Git)
3. اسحب مجلد `dist` بعد تنفيذ `npm run build` إلى منطقة السحب

### أو باستخدام Netlify CLI
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

---

## ✅ الطريقة 3: Lovable (إذا كنت تستخدمه)

موقعك الحالي: **https://adobe-stock-ai-hub.lovable.app**

1. افتح [Lovable](https://lovable.dev/projects/3f9a2272-3727-423b-9b62-355d2d301e0c)
2. ارفع التعديلات من جهازك (أو انسخ الملفات المعدّلة)
3. **Share** → **Publish** — الموقع يبقى يعمل بدون جهازك

---

## 📋 قبل النشر: بناء المشروع محلياً

```bash
cd "d:\ADOBE\New folder (5)\ؤخعقسخق\project-upgraded"
npm install
npm run build
```

سيُنشأ مجلد `dist` — هذا هو ما يتم نشره.

---

## ⚙️ متغيرات البيئة (اختياري)

إذا أردت تفعيل Claude Proxy أو Market Pulse، أضف في إعدادات النشر:

| المتغير | الوصف |
|---------|--------|
| `VITE_GEMINI_API_KEY` | مفتاح Gemini (للميزات التي تحتاج AI) |
| `VITE_CLAUDE_PROXY_URL` | رابط Claude Proxy من Supabase |
| `VITE_MARKET_PULSE_URL` | رابط Market Pulse من Supabase |

---

## 🎯 الخلاصة

| المنصة | الرابط | التكلفة |
|--------|--------|---------|
| **Vercel** | vercel.com | مجاني |
| **Netlify** | netlify.com | مجاني |
| **Lovable** | lovable.dev | حسب الخطة |

بعد النشر، الموقع سيعمل 24/7 بدون الحاجة لجهازك.
